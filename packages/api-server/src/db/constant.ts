import { envConfig } from "../base/env-config";

export const MAX_QUERY_NUMBER = parseInt(envConfig.maxQueryNumber, 10);
export const MAX_QUERY_TIME_MILSECS = parseInt(
  envConfig.maxQueryTimeInMilliseconds,
  10
);
export const MAX_QUERY_ROUNDS = parseInt(envConfig.maxQueryRounds, 10);
