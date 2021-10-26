import { FilterFlag, FilterObject, FilterType } from "./types";
import EventEmitter from "events";
import { SingleFieldTable, Store } from "./store";
import crypto from "crypto";
import { HexString } from "@ckb-lumos/base";
import {
  CACHE_TIME_TO_LIVE_MILSECS,
  CACHE_WATCH_INTERVAL_MILSECS,
} from "../methods/constant";

const CacheLifeTableName = "CacheLifeManager";
const FilterSetTableName = "FilterSet";
const LastPollsSetTableName = "lastPollsSet";

class CacheEmitter extends EventEmitter {}

export class Cache extends SingleFieldTable {
  private timeToLiveMilsecs: number; // how long the cache data to live, unit: milsec
  private watchIntervalMilsecs: number; // how often to check if cache data is expired, unit: milsec
  private expireWatcher: any; // expire cache watch timer
  private eventEmitter;

  constructor(
    timeToLiveMilsecs = CACHE_TIME_TO_LIVE_MILSECS, // default 5 minutes
    watchIntervalMilsecs = CACHE_WATCH_INTERVAL_MILSECS, // default 5 seconds
    store?: Store
  ) {
    super(CacheLifeTableName, store);
    this.timeToLiveMilsecs = timeToLiveMilsecs;
    this.watchIntervalMilsecs = watchIntervalMilsecs;
    this.expireWatcher = null;
    this.eventEmitter = new CacheEmitter();
  }

  startWatcher() {
    this.expireWatcher = setInterval(
      async () => await this.checker(),
      this.watchIntervalMilsecs
    );
  }

  stopWatcher() {
    if (!this.expireWatcher) return false;

    clearInterval(this.expireWatcher);
    return true;
  }

  async size() {
    return await this._size();
  }

  async addLife(id: string, birthTimeStamp: number) {
    return await this._insert(id, birthTimeStamp);
  }

  async updateLife(id: string, newBirthTimeStamp: number) {
    return await this._update(id, newBirthTimeStamp);
  }

  async killLife(id: string) {
    return await this._delete(id);
  }

  async isExpired(id: string) {
    const birthTimeStamp = await this._get(id);
    if (birthTimeStamp == undefined) {
      // todo: should throw error?
      return false;
    }
    return Date.now() - parseInt(birthTimeStamp) >= this.timeToLiveMilsecs;
  }

  public onExpired(callback = (_key: string) => {}) {
    this.eventEmitter.on("kill", callback);
  }

  private async checker() {
    if (!this.store.client.isOpen) {
      await this.store.init();
    }

    const data = await this._getAll();
    const ids = Object.keys(data);
    ids.forEach(async (id) => {
      if (!(await this.isExpired(id))) return false;
      await this.killLife(id);
      this.eventEmitter.emit("kill", id);
    });
  }
}

export class FilterSet extends SingleFieldTable {
  constructor(store?: Store) {
    super(FilterSetTableName, store);
  }

  // key: filter_id,
  // value: filter value
  async add(id: string, filter: FilterType) {
    if (typeof filter === "number") {
      return await this._insert(id, filter);
    }

    // verify and normalize the FilterObject before serialize
    const filterString = JSON.stringify(filter);
    return await this._insert(id, filterString);
  }

  async get(id: string) {
    const filterString = await this._get(id);
    if (filterString == undefined) {
      return undefined;
    }

    try {
      // todo: check if filterObject is valid
      return JSON.parse(filterString) as FilterObject;
    } catch (e) {
      const filterFlag = parseInt(filterString);
      if (
        filterFlag !== FilterFlag.blockFilter &&
        filterFlag !== FilterFlag.pendingTransaction
      ) {
        throw new Error("invalid value for filterType");
      }

      return filterFlag as FilterFlag;
    }
  }
}

export class LastPollSet extends SingleFieldTable {
  constructor(store?: Store) {
    super(LastPollsSetTableName, store);
  }

  // key: filter_id,
  // value: the filter's last poll record:
  //          - for eth_newBlockFilter, the last poll record is the block number (bigint)
  //          - for eth_newPendingTransactionFilter, the last poll record is the pending transaction id (bigint) (currently not support)
  //          - for normal filter, the last poll record is log_id of log (bigint)
  async add(id: string, lastPollRecord: bigint) {
    this._insert(id, "0x" + lastPollRecord.toString(16));
  }

  async get(id: string) {
    const lastPollRecordString = await this._get(id);
    if (lastPollRecordString == undefined) {
      return undefined;
    }
    const lastPollRecord: bigint = BigInt(lastPollRecordString);
    return lastPollRecord;
  }
}

export class FilterManager extends Cache {
  public filtersSet: FilterSet;
  public lastPollsSet: LastPollSet;

  constructor(
    cacheTimeToLiveMilsecs = CACHE_TIME_TO_LIVE_MILSECS, // milsec, default 5 minutes
    cacheWatchIntervalMilsecs = CACHE_WATCH_INTERVAL_MILSECS, // milsec, default 5 seconds
    enableExpired = true,
    _store?: Store
  ) {
    const store = _store || new Store();
    super(cacheTimeToLiveMilsecs, cacheWatchIntervalMilsecs, store);
    this.filtersSet = new FilterSet(store);
    this.lastPollsSet = new LastPollSet(store);

    if (enableExpired) {
      this.startWatcher();
      const that = this;
      this.onExpired(function (id: string) {
        that.removeExpiredFilter(id);
      });
    }
  }

  isConnect() {
    console.log(
      this.filtersSet.store.client.isOpen,
      this.lastPollsSet.store.client.isOpen,
      this.store.client.isOpen
    );
  }

  async connect() {
    if (!this.filtersSet.store.client.isOpen) {
      await this.filtersSet._connect();
    }

    if (!this.lastPollsSet.store.client.isOpen) {
      await this.lastPollsSet._connect();
    }

    if (!this.store.client.isOpen) {
      await this._connect();
    }
  }

  async install(filter: FilterType): Promise<HexString> {
    // add filter to filter cache
    const id = newId();
    await this.filtersSet.add(id, filter);
    // add filter's last poll record to cache
    // the initial value should be 0
    await this.lastPollsSet.add(id, BigInt(0));
    await this.addLife(id, Date.now());
    return id;
  }

  async get(id: string): Promise<FilterType | undefined> {
    const filter = await this.filtersSet.get(id);
    return filter;
  }

  async uninstall(id: string): Promise<boolean> {
    const filter = await this.filtersSet._get(id);
    if (!filter) return false; // or maybe throw `filter not exits by id: ${id}`;

    await this.filtersSet._delete(id);
    await this.lastPollsSet._delete(id);
    await this.killLife(id);

    return true;
  }

  async removeExpiredFilter(id: string) {
    const filter = await this.filtersSet.get(id);
    if (!filter) return false; // or maybe throw `filter not exits by id: ${id}`;

    await this.filtersSet._delete(id);
    await this.lastPollsSet._delete(id);
  }

  async size() {
    return await this.filtersSet._size();
  }

  async updateLastPoll(id: string, lastPoll: bigint) {
    const lp = await this.lastPollsSet.get(id);
    if (lp == undefined)
      throw new Error(`lastPollCache not exits, filter_id: ${id}`);

    await this.lastPollsSet.add(id, lastPoll);
    this.updateLife(id, Date.now());
  }

  async getLastPoll(id: string) {
    const lp = await this.lastPollsSet.get(id);
    if (lp == undefined)
      throw new Error(`lastPollCache not exits, filter_id: ${id}`);
    return lp;
  }
}

export function newId(): HexString {
  return "0x" + crypto.randomBytes(16).toString("hex");
}
