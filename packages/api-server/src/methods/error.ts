import { JSONRPCError } from "jayson";
import { logger } from "../base/logger";
import { HEADER_NOT_FOUND_ERR_MESSAGE } from "./constant";
import {
  HEADER_NOT_FOUND_ERROR,
  INTERNAL_ERROR,
  INVALID_PARAMS,
  LIMIT_EXCEEDED,
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
  constructor(message: string, data?: object) {
    super(WEB3_ERROR, message, data);
  }
}

export class InvalidParamsError extends RpcError {
  constructor(message: string) {
    super(INVALID_PARAMS, message);
  }

  padContext(context: string): InvalidParamsError {
    const msgs = this.message.split(/(invalid argument .: )/);
    // [ '', 'invalid argument <number>: ', 'message' ]
    if (msgs.length !== 3) {
      logger.error(
        `[InvalidParamsError] padContext parse message failed: ${
          this.message
        }, split array: ${JSON.stringify(msgs)}, will return origin error.`
      );
      return this;
    }
    const newMsg = `${msgs[1]}${context} -> ${msgs[2]}`;
    this.message = newMsg;
    return this;
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

export class LimitExceedError extends RpcError {
  constructor(message: string) {
    super(LIMIT_EXCEEDED, message);
  }
}
