// From https://github.com/ethereum/evmc/blob/v9.0.0/include/evmc/evmc.h#L212

import abiCoder, { AbiCoder } from "web3-eth-abi";
import { FailedReason } from "../base/types/api";
import { COMPATIBLE_DOCS_URL } from "./constant";
import { RpcError } from "./error";
import { GW_RPC_REQUEST_ERROR } from "./error-code";
import { LogItem, PolyjuiceSystemLog } from "./types";
import { HexNumber, HexString } from "@ckb-lumos/base";
import { logger } from "../base/logger";

export const evmcCodeTypeMapping: {
  [key: string]: string;
} = {
  "0": "SUCCESS",
  "1": "FAILURE",
  "2": "REVERT",
  "3": "OUT_OF_GAS",
  "4": "INVALID_INSTRUCTION",
  "5": "UNDEFINED_INSTRUCTION",
  "6": "STACK_OVERFLOW",
  "7": "STACK_UNDERFLOW",
  "8": "BAD_JUMP_DESTINATION",
  "9": "INVALID_MEMORY_ACCESS",
  "10": "CALL_DEPTH_EXCEEDED",
  "11": "STATIC_MODE_VIOLATION",
  "12": "PRECOMPILE_FAILURE",
  "13": "CONTRACT_VALIDATION_FAILURE",
  "14": "ARGUMENT_OUT_OF_RANGE",
  "15": "WASM_UNREACHABLE_INSTRUCTION",
  "16": "WASM_TRAP",
  "17": "INSUFFICIENT_BALANCE",
  "-1": "INTERNAL_ERROR",
  "-2": "REJECTED",
  "-3": "OUT_OF_MEMORY",
};

const gwErrorPrefix = "invalid exit code ";
export interface GwErrorItem {
  code: number;
  type: string;
  message: string;
}
const gwErrorMapping: { [key: string]: { type: string; message: string } } = {
  "92": {
    type: "SUDT_ERROR_INSUFFICIENT_BALANCE",
    message: "sender doesn't have enough funds to send tx",
  },
};

interface RevertErrorMapping {
  [key: string]: {
    message: (args: any[]) => string;
    argTypes: string[];
  };
}

// https://docs.soliditylang.org/en/v0.8.13/control-structures.html#panic-via-assert-and-error-via-require
const revertErrorMapping: RevertErrorMapping = {
  // Panic(uint256)
  "0x4e487b71": {
    message: (args: any[]) => {
      const revertReason: HexNumber = "0x" + BigInt(args[0]).toString(16);
      const msg = panicCodeToReason[revertReason];
      if (msg != null) {
        return `reverted with panic code ${revertReason} (${msg})`;
      }
      return `Panic(${revertReason})`;
    },
    argTypes: ["uint256"],
  },
  // Error(string)
  "0x08c379a0": {
    message: (args: any[]) => `Error(${args[0]})`,
    argTypes: ["string"],
  },
};

// From https://github.com/NomicFoundation/hardhat/blob/ef14cb35114b3e6b28ed697fe74049c38695afb3/packages/hardhat-core/src/internal/hardhat-network/stack-traces/panic-errors.ts#L13-L34
const panicCodeToReason: { [key: string]: string } = {
  "0x1": "Assertion error",
  "0x11":
    "Arithmetic operation underflowed or overflowed outside of an unchecked block",
  "0x12": "Division or modulo division by zero",
  "0x21":
    "Tried to convert a value into an enum, but the value was too big or negative",
  "0x22": "Incorrectly encoded storage byte array",
  "0x31": ".pop() was called on an empty array",
  "0x32": "Array accessed at an out-of-bounds or negative index",
  "0x41":
    "Too much memory was allocated, or an array was created that is too large",
  "0x51": "Called a zero-initialized variable of internal function type",
};

function parseReturnData(returnData: HexString): string {
  if (returnData.length < 10) {
    return "";
  }

  const abi = abiCoder as unknown as AbiCoder;

  const funcSig = returnData.slice(0, 10);
  const revertInfo = revertErrorMapping[funcSig];

  if (revertInfo != null) {
    const encodedArgs = returnData.slice(10);
    const parsedArgs = abi.decodeParameters(revertInfo.argTypes, encodedArgs);
    const args = new Array(revertInfo.argTypes.length)
      .fill(0)
      .map((_, i) => parsedArgs[i]);
    return revertInfo.message(args);
  }
  let reason = "";
  try {
    reason = abi.decodeParameter(
      "string",
      returnData.slice(10)
    ) as unknown as string;
  } catch (e) {
    logger.info(`Parse reason failed with return data: ${returnData}`);
    reason = "reverted with custom error";
  }

  return reason;
}

function parseGwErrorMapping(message: string): GwErrorItem | undefined {
  if (!message.startsWith(gwErrorPrefix)) {
    return undefined;
  }
  const code = message.slice(gwErrorPrefix.length);

  const item = gwErrorMapping[code];
  if (item != null) {
    return {
      code: +code,
      type: item.type,
      message: item.message,
    };
  }

  return undefined;
}

export interface GwErrorDetail {
  code: number;
  message: string;
  data: object;
  polyjuiceSystemLog?: PolyjuiceSystemLog;
  statusCode?: number;
  statusReason?: string;
}

export function parseGwError(error: any): GwErrorDetail {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);

    if (err.data == null) {
      parseGwRpcError(error);
    }

    const gwErrorItem = parseGwErrorMapping(err.message);
    if (gwErrorItem != null) {
      const failedReason: FailedReason = {
        status_code: "0x" + gwErrorItem.code.toString(16),
        status_type: gwErrorItem.type,
        message: gwErrorItem.message,
      };
      const data = { failed_reason: failedReason };
      const newMessage = `${failedReason.status_type.toLowerCase()}: ${
        failedReason.message
      }`;
      throw new RpcError(err.code, newMessage, data);
    }

    let polyjuiceSystemLog: PolyjuiceSystemLog | undefined;
    if (err.data.last_log) {
      polyjuiceSystemLog = parsePolyjuiceSystemLog(err.data.last_log);
    }

    const returnData = err.data.return_data;
    const statusReason: string = parseReturnData(returnData);

    return {
      code: err.code,
      message: err.message,
      data: err.data,
      polyjuiceSystemLog,
      statusCode: polyjuiceSystemLog?.statusCode,
      statusReason: statusReason,
    };
  }

  throw error;
}

export function parseGwRpcError(error: any): void {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);

    const gwErrorItem = parseGwErrorMapping(err.message);
    if (gwErrorItem != null) {
      const failedReason: FailedReason = {
        status_code: "0x" + gwErrorItem.code.toString(16),
        status_type: gwErrorItem.type,
        message: gwErrorItem.message,
      };
      const data = { failed_reason: failedReason };
      const newMessage = `${failedReason.status_type.toLowerCase()}: ${
        failedReason.message
      }`;
      throw new RpcError(err.code, newMessage, data);
    }

    const last_log: LogItem | undefined = err.data?.last_log;
    if (last_log != null) {
      const polyjuiceSystemLog = parsePolyjuiceSystemLog(err.data.last_log);
      const returnData = err.data.return_data;

      const statusReason: string = parseReturnData(returnData);

      const failedReason: FailedReason = {
        status_code: "0x" + polyjuiceSystemLog.statusCode.toString(16),
        status_type:
          evmcCodeTypeMapping[polyjuiceSystemLog.statusCode.toString()],
        message: statusReason,
      };
      const data = { failed_reason: failedReason };
      const newMessage = `${failedReason.status_type.toLowerCase()}: ${
        failedReason.message
      }`;
      throw new RpcError(err.code, newMessage, data);
    }

    // can't find backend by script hash error
    if (err.message?.includes("can't find backend for script_hash")) {
      throw new RpcError(
        err.code,
        `to address is not a valid contract. more info: ${COMPATIBLE_DOCS_URL}`
      );
    }

    throw new RpcError(err.code, err.message);
  }

  // connection error
  if (message.startsWith("request to")) {
    throw new Error(message);
  }

  throw new RpcError(GW_RPC_REQUEST_ERROR, error.message);
}

export function parsePolyjuiceSystemLog(logItem: LogItem): PolyjuiceSystemLog {
  let buf = Buffer.from(logItem.data.slice(2), "hex");
  if (buf.length !== 8 + 8 + 16 + 4 + 4) {
    throw new Error(`invalid system log raw data length: ${buf.length}`);
  }
  const gasUsed = buf.readBigUInt64LE(0);
  const cumulativeGasUsed = buf.readBigUInt64LE(8);
  const createdAddress = "0x" + buf.slice(16, 36).toString("hex");
  const statusCode = buf.readUInt32LE(36);
  return {
    gasUsed: gasUsed,
    cumulativeGasUsed: cumulativeGasUsed,
    createdAddress: createdAddress,
    statusCode: statusCode,
  };
}

export function parseGwRunResultError(err: any): RpcError {
  const gwErr = parseGwError(err);
  const failedReason: any = {};
  if (gwErr.statusCode != null) {
    failedReason.status_code = "0x" + gwErr.statusCode.toString(16);
    failedReason.status_type = evmcCodeTypeMapping[gwErr.statusCode.toString()];
  }
  if (gwErr.statusReason != null) {
    failedReason.message = gwErr.statusReason;
  }
  let errorData: any = undefined;
  if (Object.keys(failedReason).length !== 0) {
    errorData = { failed_reason: failedReason };
  }

  let errorMessage = gwErr.message;
  if (gwErr.statusReason != null && failedReason.status_type != null) {
    // REVERT => revert
    // compatible with https://github.com/EthWorks/Waffle/blob/ethereum-waffle%403.4.0/waffle-jest/src/matchers/toBeReverted.ts#L12
    errorMessage = `${failedReason.status_type.toLowerCase()}: ${
      gwErr.statusReason
    }`;
  }
  return new RpcError(gwErr.code, errorMessage, errorData);
}
