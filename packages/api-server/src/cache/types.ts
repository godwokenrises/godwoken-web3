import { HexString } from "@ckb-lumos/base";
import { BlockParameter } from "../methods/types";

export interface FilterObject {
  address?: HexString;
  fromBlock?: BlockParameter;
  toBlock?: BlockParameter;
  topics?: FilterTopic[];
  blockHash?: HexString;
}

export type FilterTopic = HexString | null | HexString[];

export enum FilterFlag {
  blockFilter = 1,
  pendingTransaction = 2,
}

export type FilterType = FilterObject | FilterFlag; // 1: block filter 2: pending transaction filter

export interface FilterCacheInDb {
  filter: FilterType;
  lastPoll: HexString;
  // the filter's last poll record:
  //          - for eth_newBlockFilter, the last poll record is the block number (bigint)
  //          - for eth_newPendingTransactionFilter, the last poll record is the pending transaction id (bigint) (currently not support)
  //          - for normal filter, the last poll record is log_id of log (bigint)
}

export interface FilterCache {
  filter: FilterType;
  lastPoll: bigint;
}
