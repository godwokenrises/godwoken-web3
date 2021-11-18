// From https://github.com/ethereum/evmc/blob/v9.0.0/include/evmc/evmc.h#L212

import abiCoder, { AbiCoder } from "web3-eth-abi";
import { LogItem, PolyjuiceSystemLog } from "./types";

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
    let polyjuiceSystemLog: PolyjuiceSystemLog | undefined;
    if (err.data.last_log) {
      polyjuiceSystemLog = parsePolyjuiceSystemLog(err.data.last_log);
    }

    const return_data = err.data.return_data;
    let statusReason = "";
    if (return_data !== "0x") {
      const abi = abiCoder as unknown as AbiCoder;
      statusReason = abi.decodeParameter(
        "string",
        return_data.substring(10)
      ) as unknown as string;
    }

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
