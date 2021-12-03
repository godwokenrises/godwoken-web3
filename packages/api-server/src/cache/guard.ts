import { Store } from "./store";
import { HexString } from "@ckb-lumos/base";
import { envConfig } from "../base/env-config";

const RedisPrefixName = "AccessGuardMap";
export const CACHE_EXPIRED_TIME_MILSECS = 1 * 60 * 1000; // milsec, default 1 minutes

export interface MaxRpmMap {
  [reqRouter: string]: number;
}

export class AccessGuard {
  public store: Store;
  public maxRpmMap: MaxRpmMap;

  constructor(
    enableExpired = true,
    expiredTimeMilsecs = CACHE_EXPIRED_TIME_MILSECS, // milsec, default 1 minutes
    store?: Store
  ) {
    this.store =
      store || new Store(envConfig.redisUrl, enableExpired, expiredTimeMilsecs);
    this.maxRpmMap = {};
  }

  isConnected() {
    return this.store.client.isOpen;
  }

  async connect() {
    if (!this.isConnected()) {
      await this.store.client.connect();
    }
  }

  async setMaxRpm(rpcRouter: string, maxRpm: number) {
    this.maxRpmMap[rpcRouter] = maxRpm;
  }

  async getCount(rpcRouter: string, reqId: string) {
    const id = getId(rpcRouter, reqId);
    const count = await this.store.get(id);
    if (count == null) {
      return null;
    }
    return +count;
  }

  async add(rpcRouter: string, reqId: string): Promise<HexString | undefined> {
    const isExist = await this.isExist(rpcRouter, reqId);
    if (!isExist) {
      const id = getId(rpcRouter, reqId);
      await this.store.insert(id, 0);
      return id;
    }
  }

  async updateCount(rpcRouter: string, reqId: string) {
    const preCount = await this.getCount(rpcRouter, reqId);
    if (preCount != null) {
      const afterCount = preCount + 1;
      const id = getId(rpcRouter, reqId);
      await this.store.insert(id, afterCount);
    }
  }

  async isExist(rpcRouter: string, reqId: string) {
    const id = getId(rpcRouter, reqId);
    const data = await this.store.get(id);
    if (data == null) return false;
    return true;
  }

  async isOverRate(rpcRouter: string, reqId: string): Promise<boolean> {
    const id = getId(rpcRouter, reqId);
    const data = await this.store.get(id);
    if (data == null) return false;
    if (this.maxRpmMap[id] == null) return false;

    const count = +data;
    const maxNumber = this.maxRpmMap[id];
    if (count > maxNumber) {
      return true;
    }
    return false;
  }
}

export function getId(rpcRouter: string, reqUniqueId: string): HexString {
  return `${RedisPrefixName}.${rpcRouter}.${reqUniqueId}`;
}
