import { BlockParameter } from "./methods/types";
import { JSONRPCError } from "jayson";
import { AppError, ERRORS } from "./methods/error";

const { platform } = require("os");
const { version: packageVersion } = require("../../../package.json");

export function getClientVersion() {
  //todo: change to rust process version
  const { version } = process;
  return `Godwoken/v${packageVersion}/${platform()}/node${version.substring(
    1
  )}`;
}

export function handleBlockParamter(block_paramter: BlockParameter): BigInt {
  switch (block_paramter) {
    case "latest":
      return BigInt("1" + "0".repeat(10)); // a very large number

    case "earliest":
      return BigInt(0);

    case "pending":
      return BigInt("1" + "0".repeat(10)); // treat it as 'latest'

    default:
      return BigInt(block_paramter);
  }
}

export function toCamel(s: string) {
  return s.replace(/([-_][a-z])/gi, ($1) => {
    return $1.toUpperCase().replace("-", "").replace("_", "");
  });
}

export function toSnake(s: string) {
  return s.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

// convert object key snake_name => camelName
export function snakeToCamel(
  t: object,
  excludeKeys: string[] = [],
  depthLimit: number = 10 // prevent memory leak for recursive
) {
  if (depthLimit === 0) {
    throw new AppError(ERRORS.INTERNAL_ERROR, {
      reason: "snakeToCamel recursive depth reached max limit",
    });
  }

  let camel: any = {};
  Object.entries(t).map(([key, value]) => {
    let newValue =
      typeof value === "object"
        ? snakeToCamel(value, excludeKeys, depthLimit - 1)
        : value;
    const newKey = excludeKeys.includes(key) ? key : toCamel(key);
    camel[newKey] = Array.isArray(value) ? Object.values(newValue) : newValue;
  });
  return camel;
}

// convert object key camelName => snake_name
export function camelToSnake(
  t: object,
  excludeKeys: string[] = [],
  depthLimit: number = 10 // prevent memory leak for recursive
) {
  if (depthLimit === 0) {
    throw new AppError(ERRORS.INTERNAL_ERROR, {
      reason: "camelToSnake recursive depth reached max limit",
    });
  }

  let snake: any = {};
  Object.entries(t).map(([key, value]) => {
    let newValue =
      typeof value === "object"
        ? camelToSnake(value, excludeKeys, depthLimit - 1)
        : value;
    const newKey = excludeKeys.includes(key) ? key : toSnake(key);
    snake[newKey] = Array.isArray(value) ? Object.values(newValue) : newValue;
  });
  return snake;
}

export function toHex(i: number | string) {
  if (typeof i !== "number" && typeof i !== "string") return i;

  return "0x" + BigInt(i).toString(16);
}

export function validateHexString(hex: string): boolean {
  return /^0x([0-9a-fA-F][0-9a-fA-F])*$/.test(hex);
}

export function validateHexNumber(hex: string): boolean {
  return /^0x(0|[0-9a-fA-F]+)$/.test(hex);
}

export function isError(entry: any): entry is Error {
  return entry && entry.name && entry.message;
}

export function isJSONRPCError(entry: any): entry is JSONRPCError {
  return entry && entry.code && entry.message;
}

export function isGwJSONRPCError(entry: any): entry is JSONRPCError {
  if (isJSONRPCError(entry)) {
    // The JSONRPC server we may request must be Godwoken, so here we can be sure that this JSONRPCError is coming from
    // the Godwoken server.
    return (entry.message as string).startsWith("JSONRPCError: server error");
  } else {
    return false;
  }
}
