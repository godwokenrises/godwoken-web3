import { Map, Set } from 'immutable';
import { FilterObject, FilterType } from './types';

export class Filter {

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
    
    constructor () {
        this.uid = 0;
        this.filtersCache = Set< Map<number, FilterType> >();
        this.lastPollCache = Set< Map<number, number> >();
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

        return id;
    }

    get (id: number): FilterType | undefined {
        const filter = this.filtersCache.findEntry(f => f.get(id) !== undefined)?.[0].get(id);
        return filter;
    }

    uninstall (id: number): boolean {
        const filter = this.filtersCache.findEntry(f => f.get(id) !== undefined)?.[0];
        const change = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];
        
        if(!filter) return false;//throw `filter not exits by id: ${id}`;

        this.filtersCache = this.filtersCache.delete(filter);
        this.lastPollCache = this.lastPollCache.delete(change!);

        return true;
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
    }

    getLastPoll(id: number){
        const filter_change = this.lastPollCache.findEntry(f => f.get(id) !== undefined)?.[0];

        if(!filter_change) throw `lastPollCache not exits, filter_id: ${id}`;
        
        return filter_change.get(id);
    }

}