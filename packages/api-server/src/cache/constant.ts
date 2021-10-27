// default filter cache setting
export const CacheLifeTableName = "CacheLifeSet";
export const FilterSetTableName = "FilterSet";
export const LastPollsSetTableName = "LastPollsSet";

export const CACHE_TIME_TO_LIVE_MILSECS = 5 * 60 * 1000; // milsec, default 5 minutes
export const CACHE_WATCH_INTERVAL_MILSECS = 1 * 60 * 1000; // milsec, default 1 minute

// limit redis store filter size
export const MAX_FILTER_TOPIC_ARRAY_LENGTH = 20;
