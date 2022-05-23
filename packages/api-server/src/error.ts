//  Error code from JSON-RPC 2.0 spec
//  reference: http://www.jsonrpc.org/specification#error_object

import { JSONRPCError } from "jayson";
import { COMPATIBLE_DOCS_URL } from "./methods/constant";

export interface ErrorKind {
  code: number;
  message: string;
}

export class AppError extends Error implements JSONRPCError {
  code: number;
  data?: object;

  constructor(kind: ErrorKind, data?: object) {
    super(kind.message);
    this.name = kind.message;
    this.code = kind.code;
    this.data = data;
  }

  addContext(context: Object): AppError {
    this.data = {
      ...this.data,
      ...context,
    };
    return this;
  }
}

const DEFAULT_ERROR_CODE: number = -32000;

export const ERRORS = Object.freeze({
  INVALID_PARAMETER: {
    code: -32602,
    message: "invalid parameter",
  } as ErrorKind,
  MISSING_PARAMETER: {
    code: DEFAULT_ERROR_CODE,
    message: "missing parameter",
  } as ErrorKind,
  JSONRPC_METHOD_NOT_SUPPORTED: {
    code: -32004,
    message: "JSONRPC method not supported",
  } as ErrorKind,

  RATE_LIMITED: {
    code: -32005,
    message: "rate limited",
  } as ErrorKind,

  INTERNAL_ERROR: {
    code: -32603,
    message: "internal error",
  } as ErrorKind,

  GW_ERROR: {
    code: -32098,
    message: "Godwoken JSONRPC error",
  } as ErrorKind,
  BLOCK_NOT_FOUND: {
    code: DEFAULT_ERROR_CODE,
    message: "block not found",
  } as ErrorKind,

  CONNECTION_RESET: {
    code: DEFAULT_ERROR_CODE,
    message: "connection reset",
  } as ErrorKind,

  DATABASE_QUERY_TOO_MANY_RESULTS: {
    code: DEFAULT_ERROR_CODE,
    message: "database query too many results",
  } as ErrorKind,
  DATABASE_QUERY_TIMEOUT: {
    code: DEFAULT_ERROR_CODE,
    message: "database query timeout",
  } as ErrorKind,
  DATABASE_QUERY_ERROR: {
    code: DEFAULT_ERROR_CODE,
    message: "database query error",
  } as ErrorKind,
  DATABASE_GENESIS_NOT_FOUND: {
    code: DEFAULT_ERROR_CODE,
    message: "database genesis block not found",
  } as ErrorKind,
  DATABASE_QUERY_OFFSET_REACHED_END: {
    code: DEFAULT_ERROR_CODE,
    message: "database query offset reached end",
  } as ErrorKind,

  GAS_LIMIT_TOO_LARGE: {
    code: DEFAULT_ERROR_CODE,
    message: "transaction gasLimit is too large",
  } as ErrorKind,
  TRANSACTION_DATA_TOO_LARGE: {
    code: DEFAULT_ERROR_CODE,
    message: "transaction data is too large",
  } as ErrorKind,
  FILTER_NOT_REGISTERED: {
    code: DEFAULT_ERROR_CODE,
    message: "filter is not registered, outdated, or removed",
  } as ErrorKind,
  FILTER_TOO_MANY_TOPICS: {
    code: DEFAULT_ERROR_CODE,
    message: "filter too many topics",
  } as ErrorKind,
  FILTER_TOPIC_TOO_LENGTHY: {
    code: DEFAULT_ERROR_CODE,
    message: "filter topic too lengthy",
  } as ErrorKind,
  FILTER_FLAG_NOT_SUPPORTED: {
    code: DEFAULT_ERROR_CODE,
    message: "filter flag not supported",
  } as ErrorKind,

  TRANSACTION_TYPE_NOT_SUPPORTED: {
    code: DEFAULT_ERROR_CODE,
    message: `unsupported transaction type (only EIP155 transaction is supported, see also ${COMPATIBLE_DOCS_URL}`,
  } as ErrorKind,
  ZERO_ADDRESS_NOT_REGISTERED: {
    code: DEFAULT_ERROR_CODE,
    message: `zero address is not registered (see also ${COMPATIBLE_DOCS_URL})`,
  } as ErrorKind,
  FROM_ADDRESS_NOT_REGISTERED: {
    code: DEFAULT_ERROR_CODE,
    message: `from address is not registered (see also ${COMPATIBLE_DOCS_URL})`,
  } as ErrorKind,
  TO_ADDRESS_NOT_REGISTERED: {
    code: DEFAULT_ERROR_CODE,
    message: `to address is not registered (see also ${COMPATIBLE_DOCS_URL})`,
  } as ErrorKind,
  TO_ADDRESS_EOA_ACCOUNT: {
    code: DEFAULT_ERROR_CODE,
    message: `to address is EOA account (see also ${COMPATIBLE_DOCS_URL})`,
  } as ErrorKind,
  INVALID_ADDRESS_FORMAT: {
    code: DEFAULT_ERROR_CODE,
    message: "invalid address format",
  } as ErrorKind,
  INVALID_ETH_REGISTRY_ADDRESS_FORMAT: {
    code: DEFAULT_ERROR_CODE,
    message: "invalid ETH registry address format",
  } as ErrorKind,

  REDIS_ERROR: {
    code: DEFAULT_ERROR_CODE,
    message: "redis error",
  } as ErrorKind,
  REDIS_POLL_TIMEOUT: {
    code: DEFAULT_ERROR_CODE,
    message: "redis pull data timeout",
  } as ErrorKind,

  UNKNOWN: {
    code: DEFAULT_ERROR_CODE,
    message: "unknown error",
  } as ErrorKind,
});
