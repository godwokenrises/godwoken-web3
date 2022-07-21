import { Hash } from "@ckb-lumos/base";
import {
  TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS,
  TX_HASH_MAPPING_PREFIX_KEY,
} from "./constant";
import { Store } from "./store";

function ethTxHashCacheKey(ethTxHash: string) {
  return `${TX_HASH_MAPPING_PREFIX_KEY}:eth:${ethTxHash}`;
}

function gwTxHashCacheKey(gwTxHash: string) {
  return `${TX_HASH_MAPPING_PREFIX_KEY}:gw:${gwTxHash}`;
}

// TODO: refactor eth.ts with this
export class TxHashMapping {
  private store: Store;

  constructor(store: Store) {
    this.store = store;
  }

  async save(ethTxHash: Hash, gwTxHash: Hash) {
    const ethTxHashKey = ethTxHashCacheKey(ethTxHash);
    await this.store.insert(
      ethTxHashKey,
      gwTxHash,
      TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS
    );
    const gwTxHashKey = gwTxHashCacheKey(gwTxHash);
    await this.store.insert(
      gwTxHashKey,
      ethTxHash,
      TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS
    );
  }

  async getEthTxHash(gwTxHash: Hash): Promise<Hash | null> {
    const gwTxHashKey = gwTxHashCacheKey(gwTxHash);
    return await this.store.get(gwTxHashKey);
  }

  async getGwTxHash(ethTxHash: Hash): Promise<Hash | null> {
    const ethTxHashKey = ethTxHashCacheKey(ethTxHash);
    return await this.store.get(ethTxHashKey);
  }
}
