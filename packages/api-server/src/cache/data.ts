import { createClient } from "redis";
import { envConfig } from "../base/env-config";
import crypto from "crypto";
import { asyncSleep } from "../util";

// init publisher redis client
export const pubClient = createClient({
  url: envConfig.redisUrl,
});
pubClient.connect();
pubClient.on("error", (err) => console.log("Redis Client Error", err));

// init subscriber redis client
export const subClient = createClient({
  url: envConfig.redisUrl,
});
subClient.connect();
subClient.on("error", (err) => console.log("Redis Client Error", err));

export const SUB_TIME_OUT_MS = 5 * 1000; // 5s;
export const LOCK_KEY_EXPIRED_TIME_OUT_MS = 60 * 1000; // 60s, the max tolerate timeout for execute call
export const DATA_KEY_EXPIRED_TIME_OUT_MS = 5 * 60 * 1000; // 5 minutes
export const POLL_INTERVAL_MS = 50; // 50ms
export const POLL_TIME_OUT_MS = 2 * 60 * 1000; // 2 minutes

export const DEFAULT_PREFIX_NAME = "defaultDataCache";
export const DEFAULT_IS_ENABLE_LOCK = true;

export interface DataCacheConstructor {
  rawDataKey: string;
  executeCallResult: ExecuteCallResult;
  prefixName?: string;
  isLockEnable?: boolean;
  lock?: Partial<RedisLock>;
  dataKeyExpiredTimeOutMs?: number;
}

export type ExecuteCallResult = () => Promise<string>;

export interface RedisLock {
  key: LockKey;
  subscribe: RedSubscribe;
  pollIntervalMs: number;
  pollTimeOutMs: number;
}

export interface LockKey {
  name: string;
  expiredTimeMs: number;
}

export interface RedSubscribe {
  channel: string;
  timeOutMs: number;
}

export class RedisDataCache {
  public prefixName: string;
  public rawDataKey: string; // unique part of dataKey
  public dataKey: string; // real dataKey saved on redis combined from rawDataKey with prefix name and so on.
  public lock: RedisLock | undefined;
  public dataKeyExpiredTimeOut: number;
  public executeCallResult: ExecuteCallResult;

  constructor(args: DataCacheConstructor) {
    this.prefixName = args.prefixName || DEFAULT_PREFIX_NAME;
    this.rawDataKey = args.rawDataKey;
    this.dataKey = `${this.prefixName}:key:${this.rawDataKey}`;
    this.executeCallResult = args.executeCallResult;
    this.dataKeyExpiredTimeOut =
      args.dataKeyExpiredTimeOutMs || DATA_KEY_EXPIRED_TIME_OUT_MS;

    const isLockEnable = args.isLockEnable || DEFAULT_IS_ENABLE_LOCK; // default is true;
    if (isLockEnable) {
      this.lock = {
        key: {
          name:
            args.lock?.key?.name ||
            `${this.prefixName}:lock:${this.rawDataKey}`,
          expiredTimeMs:
            args.lock?.key?.expiredTimeMs || LOCK_KEY_EXPIRED_TIME_OUT_MS,
        },
        subscribe: {
          channel:
            args.lock?.subscribe?.channel ||
            `${this.prefixName}:channel:${this.rawDataKey}`,
          timeOutMs: args.lock?.subscribe?.timeOutMs || SUB_TIME_OUT_MS,
        },
        pollIntervalMs: args.lock?.pollIntervalMs || POLL_INTERVAL_MS,
        pollTimeOutMs: args.lock?.pollTimeOutMs || POLL_TIME_OUT_MS,
      };
    }
  }

  async get() {
    const dataKey = this.dataKey;
    const value = await pubClient.get(dataKey);
    if (value !== null) {
      console.debug(
        `[${this.constructor.name}]: hit cache via Redis.Get, key: ${dataKey}`
      );
      return value;
    }

    const setDataKeyOptions = { PX: this.dataKeyExpiredTimeOut };

    if (this.lock == undefined) {
      const result = await this.executeCallResult();
      // set data cache
      await pubClient.set(dataKey, result, setDataKeyOptions);
      return result;
    }

    // use redis-lock for data cache
    const t1 = new Date();
    const lockValue = getLockUniqueValue();
    const setLockKeyOptions = {
      NX: true,
      PX: this.lock.key.expiredTimeMs,
    };

    const releaseLock = async (lockValue: string) => {
      if (!this.lock) throw new Error("enable lock first!");

      const value = await pubClient.get(this.lock.key.name);
      if (value === lockValue) {
        // only lock owner can delete the lock
        const delNumber = await pubClient.del(this.lock.key.name);
        console.debug(
          `[${this.constructor.name}]: delete key ${this.lock.key.name}, result: ${delNumber}`
        );
      }
    };

    while (true) {
      const value = await pubClient.get(dataKey);
      if (value !== null) {
        console.debug(
          `[${this.constructor.name}]: hit cache via Redis.Get, key: ${dataKey}`
        );
        return value;
      }

      const isLockAcquired = await pubClient.set(
        this.lock.key.name,
        lockValue,
        setLockKeyOptions
      );

      if (isLockAcquired) {
        try {
          const result = await this.executeCallResult();
          // set data cache
          await pubClient.set(dataKey, result, setDataKeyOptions);
          // publish the result to channel
          const totalSubs = await pubClient.publish(
            this.lock.subscribe.channel,
            result
          );
          console.debug(
            `[${this.constructor.name}]: publish message ${result} on channel ${this.lock.subscribe.channel}, total subscribers: ${totalSubs}`
          );
          await releaseLock(lockValue);
          return result;
        } catch (error) {
          console.debug(error);
          await releaseLock(lockValue);
        }
      }

      // if lock is not acquired
      try {
        const msg = await this.subscribe();
        console.debug(
          `[${this.constructor.name}]: hit cache via Redis.Subscribe, key: ${dataKey}`
        );
        return msg;
      } catch (error: any) {
        if (
          !JSON.stringify(error).includes(
            "subscribe channel for message time out"
          )
        ) {
          console.debug(`[${this.constructor.name}]: subscribe err:`, error);
        }
      }

      // check if poll time out
      const t2 = new Date();
      const diff = t1.getTime() - t2.getTime();
      if (diff > this.lock.pollTimeOutMs) {
        throw new Error(
          `poll data value from cache layer time out ${this.lock.pollTimeOutMs}`
        );
      }

      await asyncSleep(this.lock.pollIntervalMs);
    }
  }

  async subscribe() {
    if (this.lock == undefined) {
      throw new Error(`enable redis lock first!`);
    }

    const p = new Promise((resolve) => {
      subClient.subscribe(
        this.lock!.subscribe.channel,
        async (message: string) => {
          await subClient.unsubscribe(this.lock!.subscribe.channel);
          return resolve(message);
        }
      );
    });

    const t = new Promise((_resolve, reject) => {
      setTimeout(() => {
        return reject(
          `subscribe channel for message time out ${this.lock?.subscribe.timeOutMs}`
        );
      }, this.lock?.subscribe.timeOutMs);
    });

    return (await Promise.race([p, t])) as Promise<string>;
  }
}

export function getLockUniqueValue() {
  return "0x" + crypto.randomBytes(20).toString("hex");
}
