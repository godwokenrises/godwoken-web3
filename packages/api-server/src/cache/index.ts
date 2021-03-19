import { Map, Set } from 'immutable';
import { FilterObject, FilterType } from './types';

const EventEmitter = require('events');
class MyEmitter extends EventEmitter {};


export class Cache {
    
    private milsecsToLive: number;
    private watch_interval: number;
    private expireWatcher: any;
    private lifeManager: Set< Map<number, number> >; // key: id, value: life's birthdate
    private eventEmitter;

    constructor(
        milsecsToLive = 5 * 60 * 1000,  // how long the cache data to live
        watch_interval = 5 * 1000 // how often to check if cache data is expired
    ) 
    {
        this.milsecsToLive = milsecsToLive;
        this.lifeManager = Set();
        this.watch_interval = watch_interval;
        this.expireWatcher = null;
        
        this.eventEmitter = new MyEmitter();
    }

    startWatcher(){
        this.expireWatcher = setInterval(()=> this.checker(this.lifeManager), this.watch_interval); 
    }

    stopWatcher(){
        if(!this.expireWatcher)
            return false;
        
        clearInterval(this.expireWatcher);
        return true;
    }

    size(){
        if(!this.lifeManager)
            return 0;
        
        return this.lifeManager.size;
    }

    addLife(key: number, value: number){
        this.lifeManager = this.lifeManager.add(Map<number, number>().set(key, value));
    }

    updateLife(key: number, value: number){
        const life = this.lifeManager.findEntry(life => life.get(key) !== undefined)?.[0];
        if(!life)
            return false;
        
        const new_life = Map<number, number>().set(key, value);
        this.lifeManager = this.lifeManager.delete(life);
        this.lifeManager = this.lifeManager.add(new_life);
        return true;
    }

    killLife(key: number){
        const life = this.lifeManager.findEntry(life => life.get(key) !== undefined)?.[0];
        if(!life)
            return false; 
        
        this.lifeManager = this.lifeManager.delete(life);
        return true;
    }

    isExpired(key: number){
        const life = this.lifeManager.findEntry(life => life.get(key) !== undefined)?.[0];
        if(!life)
            return false;
        
        return (Date.now() - life.get(key)!) >= this.milsecsToLive;
    }

    public onExpired(callback=(key:number) => {}){
        this.eventEmitter.on("kill", callback);
    }

    private checker(lifeManager: Set<Map<number, number>>){
        lifeManager.forEach(life => {
            const entries = life.entries()
            for( const eny of entries){
                const key = eny[0];

                if(!this.isExpired(key))
                    return false;
        
                this.killLife(key);
                this.eventEmitter.emit('kill', key);
            }
        });
    }
}



export class Filter {

    private cache: Cache;
    // self-increase number
    // will be used as the filter id when creating a new filter
    private uid: number;

    // key: filter_id,
    // value: filter value
    private filtersCache: Set< Map<number, FilterType> >; 

    // key: filter_id, 
    // value: the filter's last poll record: 
    //          - for eth_newBlockFilter, the last poll record is the block number (number)
    //          - for eth_newPendingTransactionFilter, the last poll record is the pending transaction id (number) (currently not support)
    //          - for normal filter, the last poll record is log_id of log (number)
    private lastPollCache: Set< Map<number, number> >; 
    
    constructor (
        cacheTTL=5*60*1000, // milsec, default 5 minutes 
        cacheWI=5*10000, // milsec, default 5 seconds 
        enableExpired=true
    ) {
        this.uid = 0;
        this.filtersCache = Set< Map<number, FilterType> >();
        this.lastPollCache = Set< Map<number, number> >();

        //@ts-ignore
        this.cache = new Cache(cacheTTL, cacheWI);

        if(enableExpired){
            this.cache.startWatcher();
            const that = this;
            this.cache.onExpired(function(key: number){
                that.removeExpiredFilter(key);
            });
        }
    }

    install (filter: FilterType) {
        // increase the global id number
        this.uid++;

        // add filter to filter cache
        const id = this.uid;
        const fc = Map<number, FilterType>().set(id, filter);
        this.filtersCache = this.filtersCache.add(fc);

        // add filter's last poll record to cache
        // the initial value should be 0
        const lp_record = Map<number, number>().set(id, 0);
        this.lastPollCache = this.lastPollCache.add(lp_record);

        this.cache.addLife(id, Date.now());

        return id;
    }

    get (id: number): FilterType | undefined {
        const filter = this.filtersCache.findEntry(f => f.get(id) !== undefined)?.[0].get(id);
        return filter;
    }

    uninstall (id: number): boolean {
        const filter = this.filtersCache.findEntry(f => f.get(id) !== undefined)?.[0];
        const lastpoll = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];
        
        if(!filter) return false;//throw `filter not exits by id: ${id}`;

        this.filtersCache = this.filtersCache.delete(filter);
        this.lastPollCache = this.lastPollCache.delete(lastpoll!);

        this.cache.killLife(id);

        return true;
    }

    removeExpiredFilter(id: number){
        const filter = this.filtersCache.findEntry(f => f.get(id) !== undefined)?.[0];
        const lastpoll = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];
        
        if(!filter) return false;//throw `filter not exits by id: ${id}`;

        this.filtersCache = this.filtersCache.delete(filter);
        this.lastPollCache = this.lastPollCache.delete(lastpoll!);
    }

    size () {
        return this.filtersCache.size;
    }

    updateLastPollCache(id: number, last_poll: number) {

        const lp = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];

        if(!lp) throw `lastPollCache not exits, filter_id: ${id}`;
        
        const new_lp = Map<number, number>().set(id, last_poll);

        this.lastPollCache = this.lastPollCache.delete(lp);
        this.lastPollCache = this.lastPollCache.add(new_lp);

        this.cache.updateLife(id, Date.now());
    }

    getLastPoll(id: number){
        const lastpoll = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];

        if(!lastpoll) throw `lastPollCache not exits, filter_id: ${id}`;
        
        return lastpoll.get(id);
    }

}
