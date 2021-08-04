import { JSONRPCError } from "jayson";
import { HEADER_NOT_FOUND_ERR_MESSAGE } from "./constant";
import {
  HEADER_NOT_FOUND_ERROR,
  INTERNAL_ERROR,
  INVALID_PARAMS,
  METHOD_NOT_SUPPORT,
  WEB3_ERROR,
} from "./error-code";

export class RpcError extends Error implements JSONRPCError {
  code: number;
  data?: object;

  constructor(code: number, message: string, data?: object) {
    super(message);
    this.name = "RpcError";

    this.code = code;
    this.data = data;
  }
}

export class Web3Error extends RpcError {
  constructor(message: string) {
    super(WEB3_ERROR, message);
  }
}

export class InvalidParamsError extends RpcError {
  constructor(message: string) {
    super(INVALID_PARAMS, message);
  }
}

export class InternalError extends RpcError {
  constructor(message: string) {
    super(INTERNAL_ERROR, message);
  }
}

export class MethodNotSupportError extends RpcError {
  constructor(message: string) {
    super(METHOD_NOT_SUPPORT, message);
  }
}

export class HeaderNotFoundError extends RpcError {
  constructor(message: string = HEADER_NOT_FOUND_ERR_MESSAGE) {
    super(HEADER_NOT_FOUND_ERROR, message);
  }
}
