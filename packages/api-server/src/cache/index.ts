import { Map, Set } from "immutable";
import { FilterType } from "./types";
import EventEmitter from "events";

class CacheEmitter extends EventEmitter {}

export class Cache {
  // todo: add a maxCacheLimit to prevent memory leak.

  private milsecsToLive: number; // how long the cache data to live, unit: milsec
  private watch_interval: number; // how often to check if cache data is expired, unit: milsec
  private expireWatcher: any; // expire cache watch timer
  private lifeManager: Set<Map<number, number>>; // key: id, value: life's birth timestamp in milsec
  private eventEmitter;

  constructor(
    milsecsToLive = 5 * 60 * 1000, // default 5 minutes
    watch_interval = 5 * 1000 // default 5 seconds
  ) {
    this.milsecsToLive = milsecsToLive;
    this.lifeManager = Set();
    this.watch_interval = watch_interval;
    this.expireWatcher = null;

    this.eventEmitter = new CacheEmitter();
  }

  startWatcher() {
    this.expireWatcher = setInterval(
      () => this.checker(this.lifeManager),
      this.watch_interval
    );
  }

  stopWatcher() {
    if (!this.expireWatcher) return false;

    clearInterval(this.expireWatcher);
    return true;
  }

  size() {
    if (!this.lifeManager) return 0;

    return this.lifeManager.size;
  }

  addLife(key: number, value: number) {
    this.lifeManager = this.lifeManager.add(
      Map<number, number>().set(key, value)
    );
  }

  updateLife(key: number, value: number) {
    const life = this.lifeManager.findEntry(
      (life) => life.get(key) !== undefined
    )?.[0];
    if (!life) return false;

    const new_life = Map<number, number>().set(key, value);
    this.lifeManager = this.lifeManager.delete(life);
    this.lifeManager = this.lifeManager.add(new_life);
    return true;
  }

  killLife(key: number) {
    const life = this.lifeManager.findEntry(
      (life) => life.get(key) !== undefined
    )?.[0];
    if (!life) return false;

    this.lifeManager = this.lifeManager.delete(life);
    return true;
  }

  isExpired(key: number) {
    const life = this.lifeManager.findEntry(
      (life) => life.get(key) !== undefined
    )?.[0];
    if (!life) return false;

    return Date.now() - life.get(key)! >= this.milsecsToLive;
  }

  public onExpired(callback = (_key: number) => {}) {
    this.eventEmitter.on("kill", callback);
  }

  private checker(lifeManager: Set<Map<number, number>>) {
    lifeManager.forEach((life) => {
      const entries = life.entries();
      for (const eny of entries) {
        const key = eny[0];

        if (!this.isExpired(key)) return false;

        this.killLife(key);
        this.eventEmitter.emit("kill", key);
      }
    });
  }
}

export class FilterManager extends Cache {
  // private cache: Cache;
  // self-increase number
  // will be used as the filter id when creating a new filter
  private uid: number;

  // key: filter_id,
  // value: filter value
  private filtersSet: Set<Map<number, FilterType>>;

  // key: filter_id,
  // value: the filter's last poll record:
  //          - for eth_newBlockFilter, the last poll record is the block number (number)
  //          - for eth_newPendingTransactionFilter, the last poll record is the pending transaction id (number) (currently not support)
  //          - for normal filter, the last poll record is log_id of log (number)
  private lastPollsSet: Set<Map<number, number>>;

  constructor(
    cacheTTL = 5 * 60 * 1000, // milsec, default 5 minutes
    cacheWI = 5 * 10000, // milsec, default 5 seconds
    enableExpired = true
  ) {
    super(cacheTTL, cacheWI);

    this.uid = 0;
    this.filtersSet = Set<Map<number, FilterType>>();
    this.lastPollsSet = Set<Map<number, number>>();

    if (enableExpired) {
      this.startWatcher();
      const that = this;
      this.onExpired(function (key: number) {
        that.removeExpiredFilter(key);
      });
    }
  }

  install(filter: FilterType) {
    // increase the global id number
    // todo: maybe replace with a more robust id method
    this.uid++;

    // add filter to filter cache
    const id = this.uid;
    const fc = Map<number, FilterType>().set(id, filter);
    this.filtersSet = this.filtersSet.add(fc);

    // add filter's last poll record to cache
    // the initial value should be 0
    const lp_record = Map<number, number>().set(id, 0);
    this.lastPollsSet = this.lastPollsSet.add(lp_record);

    this.addLife(id, Date.now());

    return id;
  }

  get(id: number): FilterType | undefined {
    const filter = this.filtersSet
      .findEntry((f) => f.get(id) !== undefined)?.[0]
      .get(id);
    return filter;
  }

  uninstall(id: number): boolean {
    const filter = this.filtersSet.findEntry(
      (f) => f.get(id) !== undefined
    )?.[0];
    const lastpoll = this.lastPollsSet.findEntry(
      (f) => f.get(id) !== undefined
    )?.[0];

    if (!filter) return false; // or maybe throw `filter not exits by id: ${id}`;

    this.filtersSet = this.filtersSet.delete(filter);
    this.lastPollsSet = this.lastPollsSet.delete(lastpoll!);

    this.killLife(id);

    return true;
  }

  removeExpiredFilter(id: number) {
    const filter = this.filtersSet.findEntry(
      (f) => f.get(id) !== undefined
    )?.[0];
    const lastpoll = this.lastPollsSet.findEntry(
      (f) => f.get(id) !== undefined
    )?.[0];

    if (!filter) return false; // or maybe throw `filter not exits by id: ${id}`;

    this.filtersSet = this.filtersSet.delete(filter);
    this.lastPollsSet = this.lastPollsSet.delete(lastpoll!);
  }

  size() {
    return this.filtersSet.size;
  }

  updateLastPoll(id: number, last_poll: number) {
    const lp = this.lastPollsSet.findEntry((f) => f.get(id) !== undefined)?.[0];

    if (!lp) throw `lastPollCache not exits, filter_id: ${id}`;

    const new_lp = Map<number, number>().set(id, last_poll);

    this.lastPollsSet = this.lastPollsSet.delete(lp);
    this.lastPollsSet = this.lastPollsSet.add(new_lp);

    this.updateLife(id, Date.now());
  }

  getLastPoll(id: number) {
    const lastpoll = this.lastPollsSet.findEntry(
      (f) => f.get(id) !== undefined
    )?.[0];

    if (!lastpoll) throw `lastPollCache not exits, filter_id: ${id}`;

    return lastpoll.get(id);
  }
}
