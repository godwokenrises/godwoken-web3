import { FilterManager } from "./cache";
import {
  CACHE_TIME_TO_LIVE_MILSECS,
  CACHE_WATCH_INTERVAL_MILSECS,
} from "./methods/constant";

export function startCacheCleaner() {
  const enableExpired = true;
  const filterCleaner = new FilterManager(
    CACHE_TIME_TO_LIVE_MILSECS,
    CACHE_WATCH_INTERVAL_MILSECS,
    enableExpired
  );
  return filterCleaner;
}
