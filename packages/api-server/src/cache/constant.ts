// default filter cache setting
export const CACHE_EXPIRED_TIME_MILSECS = 5 * 60 * 1000; // milsec, default 5 minutes
// limit redis store filter size
export const MAX_FILTER_TOPIC_ARRAY_LENGTH = 20;

// The Cache Key Prfixs
export const GW_RPC_KEY = "gwRPC";

export const TX_HASH_MAPPING_PREFIX_KEY = "TxHashMapping";
export const TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS = 30 * 60 * 1000; // 30 minutes
