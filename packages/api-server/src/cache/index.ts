import {
  FilterCacheInDb,
  FilterFlag,
  FilterTopic,
  FilterType,
  FilterCache,
} from "./types";
import { Store } from "./store";
import crypto from "crypto";
import { HexString } from "@ckb-lumos/base";
import {
  CACHE_EXPIRED_TIME_MILSECS,
  MAX_FILTER_TOPIC_ARRAY_LENGTH,
} from "./constant";
import { validators } from "../methods/validator";
import { envConfig } from "../base/env-config";
import { AppError, ERRORS } from "../methods/error";

export class FilterManager {
  public store: Store;

  constructor(
    enableExpired = false,
    expiredTimeMilsecs = CACHE_EXPIRED_TIME_MILSECS, // milsec, default 5 minutes
    store?: Store
  ) {
    this.store =
      store || new Store(envConfig.redisUrl, enableExpired, expiredTimeMilsecs);
  }

  isConnected() {
    return this.store.client.isOpen;
  }

  async connect() {
    if (!this.isConnected()) {
      await this.store.client.connect();
    }
  }

  async install(
    filter: FilterType,
    initialPollIdx: bigint
  ): Promise<HexString> {
    verifyFilterType(filter);
    const id = newId();
    const filterCache: FilterCache = {
      filter: filter,
      lastPoll: initialPollIdx,
    };
    await this.store.insert(id, serializeFilterCache(filterCache));
    return id;
  }

  async get(id: string): Promise<FilterType | undefined> {
    const data = await this.store.get(id);
    if (data == null) return undefined;

    const filterCache = deserializeFilterCache(data);
    return filterCache.filter;
  }

  async uninstall(id: string): Promise<boolean> {
    const filter = await this.get(id);
    if (!filter) return false; // or maybe throw `filter not exits by id: ${id}`;

    await this.store.delete(id);
    return true;
  }

  async getFilterCache(id: string): Promise<FilterCache> {
    const data = await this.store.get(id);
    if (data == null)
      throw new AppError(ERRORS.FILTER_NOT_REGISTERED, { filter_id: id });

    return deserializeFilterCache(data);
  }

  async updateLastPoll(id: string, lastPoll: bigint) {
    let filterCache = await this.getFilterCache(id);
    filterCache.lastPoll = lastPoll;
    this.store.insert(id, serializeFilterCache(filterCache));
  }

  async getLastPoll(id: string) {
    const filterCache = await this.getFilterCache(id);
    return filterCache.lastPoll;
  }

  async size() {
    return await this.store.size();
  }
}

export function newId(): HexString {
  return "0x" + crypto.randomBytes(16).toString("hex");
}

export function verifyLimitSizeForTopics(topics?: FilterTopic[]) {
  if (topics == null) {
    return;
  }

  if (topics.length > MAX_FILTER_TOPIC_ARRAY_LENGTH) {
    throw new AppError(ERRORS.FILTER_TOO_MANY_TOPICS, {
      limit: MAX_FILTER_TOPIC_ARRAY_LENGTH,
      actual: topics.length,
    });
  }

  for (const topic of topics) {
    if (Array.isArray(topic)) {
      // FIXME: distinguish limits for topics.length and topic.length
      if (topic.length > MAX_FILTER_TOPIC_ARRAY_LENGTH) {
        throw new AppError(ERRORS.FILTER_TOPIC_TOO_LENGTHY, {
          limit: MAX_FILTER_TOPIC_ARRAY_LENGTH,
          actual: topic.length,
        });
      }
    }
  }
}

export function verifyFilterType(filter: any) {
  if (typeof filter === "number") {
    return verifyFilterFlag(filter);
  }

  verifyFilterObject(filter);
  verifyLimitSizeForTopics(filter.topics);
}

export function verifyFilterFlag(target: any) {
  if (
    target !== FilterFlag.blockFilter &&
    target !== FilterFlag.pendingTransaction
  ) {
    throw new AppError(ERRORS.FILTER_FLAG_NOT_SUPPORTED, {
      filterFlag: target,
    });
  }
}

export function verifyFilterObject(target: any) {
  return validators.newFilterParams([target], 0);
}

export function serializeFilterCache(data: FilterCache) {
  const filterDb: FilterCacheInDb = {
    filter: data.filter,
    lastPoll: "0x" + data.lastPoll.toString(16),
  };
  return JSON.stringify(filterDb);
}

export function deserializeFilterCache(data: string): FilterCache {
  const filterCacheInDb: FilterCacheInDb = JSON.parse(data);
  validators.hexNumber([filterCacheInDb.lastPoll], 0);

  const filterCache: FilterCache = {
    filter: filterCacheInDb.filter,
    lastPoll: BigInt(filterCacheInDb.lastPoll),
  };

  verifyFilterType(filterCache.filter);
  return filterCache;
}
