import { HexString } from "@ckb-lumos/base";
import {
  TX_DATA_NONE_ZERO_GAS,
  TX_DATA_ZERO_GAS,
  TX_GAS,
  TX_GAS_CONTRACT_CREATION,
} from "./methods/constant";
import { BlockParameter } from "./methods/types";

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
  if (!block_paramter) throw new Error("block_parameter is undefind!");

  switch (block_paramter) {
    case "latest":
      return BigInt("1" + "0".repeat(10)); // a very large number

    case "earliest":
      return BigInt(0);

    case "pending":
      // throw new Error("pending transaction unsupported.");
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
    throw new Error("[snakeToCamel] recursive depth reached max limit.");
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
    throw new Error("[camelToSnake] recursive depth reached max limit.");
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

export function calcIntrinsicGas(
  to: HexString | undefined,
  input: HexString | undefined
) {
  to = to === "0x" ? undefined : to;
  const isCreate = to == null;
  let gas: bigint;
  if (isCreate) {
    gas = BigInt(TX_GAS_CONTRACT_CREATION);
  } else {
    gas = BigInt(TX_GAS);
  }

  if (input && input.length > 0) {
    const buf = Buffer.from(input.slice(2), "hex");
    const byteLen = buf.byteLength;
    let nonZeroLen = 0;
    for (const b of buf) {
      if (b !== 0) {
        nonZeroLen++;
      }
    }
    const zeroLen = byteLen - nonZeroLen;
    gas =
      gas +
      BigInt(zeroLen) * BigInt(TX_DATA_ZERO_GAS) +
      BigInt(nonZeroLen) * BigInt(TX_DATA_NONE_ZERO_GAS);
  }
  return gas;
}

export function calcFee(serializedL2Tx: HexString, feeRate: bigint) {
  const byteLen = BigInt(serializedL2Tx.slice(2).length / 2);
  return byteLen * feeRate;
}

export async function asyncSleep(ms = 0) {
  return new Promise((r) => setTimeout(() => r("ok"), ms));
}
