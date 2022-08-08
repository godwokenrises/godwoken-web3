require("newrelic");
import { RedisClientType, createClient } from "redis";
import { logger } from "../base/logger";
import { CACHE_EXPIRED_TIME_MILSECS } from "../cache/constant";

// redis SET type
// take from https://github.com/redis/node-redis/blob/2a7a7c1c2e484950ceb57497f786658dacf19127/lib/commands/SET.ts
type MaximumOneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]?: T[K] } & Partial<Record<Exclude<keyof T, K>, never>>
  : never;
type SetTTL = MaximumOneOf<{
  EX: number;
  PX: number;
  EXAT: number;
  PXAT: number;
  KEEPTTL: true;
}>;
type SetGuards = MaximumOneOf<{
  NX: true;
  XX: true;
}>;
interface SetCommonOptions {
  GET?: true;
}
type SetOptions = SetTTL & SetGuards & SetCommonOptions;

export class Store {
  public client: RedisClientType;
  public setOptions: SetOptions;

  constructor(
    url?: string,
    enableExpired?: boolean,
    keyExpiredTimeMilSecs?: number
  ) {
    this.client = createClient({
      url: url,
    });
    this.client.on("error", (err: any) =>
      logger.error("Redis Client Error", err)
    );

    if (enableExpired == null) {
      enableExpired = false;
    }

    this.setOptions = enableExpired
      ? {
          PX: keyExpiredTimeMilSecs || CACHE_EXPIRED_TIME_MILSECS,
        }
      : {};
  }

  async init() {
    if (!this.client.isOpen) await this.client.connect();
  }

  async insert(
    key: string,
    value: string | number,
    expiredTimeMilSecs?: number
  ) {
    let setOptions = this.setOptions;
    const PX = expiredTimeMilSecs || this.setOptions.PX;
    if (PX) {
      setOptions.PX = PX;
    }

    return await this.client.set(key, value.toString(), setOptions);
  }

  async delete(key: string) {
    return await this.client.del(key);
  }

  async get(key: string) {
    return await this.client.get(key);
  }

  async size() {
    return await this.client.dbSize();
  }

  async addSet(name: string, members: string | string[]) {
    return await this.client.sAdd(name, members);
  }
}
