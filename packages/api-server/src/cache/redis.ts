import { RedisClientType, createClient } from "redis";
import { envConfig } from "../base/env-config";
import { logger } from "../base/logger";

// redis SET type
// take from https://github.com/redis/node-redis/blob/2a7a7c1c2e484950ceb57497f786658dacf19127/lib/commands/SET.ts
export type MaximumOneOf<T, K extends keyof T = keyof T> = K extends keyof T
  ? { [P in K]?: T[K] } & Partial<Record<Exclude<keyof T, K>, never>>
  : never;
export type SetTTL = MaximumOneOf<{
  EX: number;
  PX: number;
  EXAT: number;
  PXAT: number;
  KEEPTTL: true;
}>;
export type SetGuards = MaximumOneOf<{
  NX: true;
  XX: true;
}>;
export interface SetCommonOptions {
  GET?: true;
}
export type SetOptions = SetTTL & SetGuards & SetCommonOptions;
// endOf Typing

// create global redis client
export const globalClient: RedisClientType = createClient({
  url: envConfig.redisUrl,
});

globalClient.on("error", (err: any) => logger.error("Redis Client Error", err));
globalClient.on("end", () => logger.error("Redis Client terminated.."));
// note: node-redis will auto reconnect if error occurs
globalClient.on("reconnecting", () =>
  logger.debug("Redis Client reconnecting..")
);
