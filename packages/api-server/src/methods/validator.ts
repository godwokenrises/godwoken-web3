import {
  isGwJSONRPCError,
  validateHexNumber,
  validateHexString,
} from "../util";
import { BlockParameter } from "./types";
import { logger } from "../base/logger";
import { AppError, ERRORS } from "./error";
import {
  POLY_MAX_CONTRACT_CODE_SIZE_IN_BYTE,
  RPC_MAX_GAS_LIMIT,
} from "./constant";
import { HexString } from "@ckb-lumos/base";

/**
 * middleware for parameters validation
 * @param {Function} method            function to add middleware
 * @param {number} requiredParamsCount required parameters count
 * @param {Function[]} validators      array of validator
 */
export function middleware(
  method: (args: any[] | any) => any | Promise<any>,
  requiredParamsCount: number,
  validators: any[] = []
): any {
  return async function (params: any[] = []): Promise<any> {
    if (params.length < requiredParamsCount) {
      throw new AppError(ERRORS.MISSING_PARAMETER, {
        nRequiredParameters: requiredParamsCount,
        nActualParameters: params.length,
      });
    }

    for (let i = 0; i < validators.length; i++) {
      const err = validators[i](params, i);
      if (err && err instanceof AppError) {
        throw err;
      } else {
        logger.warn("internal error:", err);
        throw new AppError(ERRORS.INTERNAL_ERROR, { reason: err });
      }
    }

    try {
      return await method(params);
    } catch (err: any) {
      logger.error(
        `JSONRPC Server Error: [${method.name}] ${err} ${err.stack}`
      );
      // TODO Handle database and redis error
      if (err instanceof AppError) {
        throw err;
      } else if (isGwJSONRPCError(err)) {
        throw new AppError(ERRORS.GW_ERROR, { reason: err });
      } else {
        logger.warn("internal error:", err);
        throw new AppError(ERRORS.INTERNAL_ERROR, { reason: err });
      }
    }
  };
}

export const validators = {
  /**
   * hex validator to ensure has "0x" prefix
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */

  /**
   * hex string validator
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  hexString(params: any[], index: number) {
    return verifyHexString(params[index], index);
  },

  hexNumber(params: any[], index: number) {
    return verifyHexNumber(params[index], index);
  },

  storageKey(params: any[], index: number) {
    return verifyStorageKey(params[index], index);
  },

  /**
   * Hex number | "latest" | "earliest" | "pending"
   * @param params
   * @param index
   * @returns
   */
  blockParameter(params: any[], index: number) {
    return verifyBlockParameter(params[index], index);
  },

  /**
   * hex validator to validate block hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  blockHash(params: any[], index: number) {
    return verifyBlockHash(params[index], index);
  },

  /**
   * hex validator to validate transaction hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  txHash(params: any[], index: number) {
    return verifyTxHash(params[index], index);
  },

  /**
   * hex validator to validate block hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  address(params: any[], index: number) {
    return verifyAddress(params[index], index);
  },

  /**
   * bool validator to check if type is boolean
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  bool(params: any[], index: number) {
    return verifyBoolean(params[index], index);
  },

  ethCallParams(params: any[], index: number) {
    return verifyEthCallObject(params[index], index);
  },

  ethEstimateGasParams(params: any[], index: number) {
    return verifyEstimateGasCallObject(params[index], index);
  },

  newFilterParams(params: any[], index: number) {
    return verifyNewFilterObj(params[index], index);
  },
};

//****** standalone verify function ********/
export function verifyBoolean(bool: any, index: number): AppError | undefined {
  if (typeof bool !== "boolean") {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: bool,
      reason: "not boolean type",
    });
  }
  return undefined;
}

export function verifyHexNumber(
  hexNumber: string,
  index: number
): AppError | undefined {
  if (!hexNumber.startsWith("0x")) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexNumber,
      reason: "without 0x prefix",
    });
  }

  if (!validateHexNumber(hexNumber)) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexNumber,
      reason: "contains invalid token",
    });
  }

  return undefined;
}

export function verifyHexString(
  hexString: any,
  index: number
): AppError | undefined {
  if (typeof hexString !== "string") {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexString,
      reason: "not string type",
    });
  }

  if (!hexString.startsWith("0x")) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexString,
      reason: "without 0x prefix",
    });
  }

  if (hexString.length % 2 !== 0) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexString,
      reason: "not even length",
    });
  }

  if (!validateHexString(hexString)) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: hexString,
      reason: "contains invalid token",
    });
  }

  return undefined;
}

export function verifyAddress(
  address: any,
  index: number
): AppError | undefined {
  const err = verifyHexString(address, index);
  if (err) {
    return err.addContext({ type: "address" });
  }

  if (address.substring(2).length !== 40) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: address,
      type: "address",
      reason: `expected address length is 20, but got ${
        address.substring(2).length / 2
      }`,
    });
  }

  return undefined;
}

export function verifyBlockHash(
  blockHash: any,
  index: number
): AppError | undefined {
  const err = verifyHexString(blockHash, index);
  if (err) {
    return err.addContext({ type: "blockHash" });
  }

  if (blockHash.substring(2).length !== 64) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: blockHash,
      type: "blockHash",
      reason: `expected hash length is 32, but got ${
        blockHash.substring(2).length / 2
      }`,
    });
  }

  return undefined;
}

export function verifyTxHash(txHash: any, index: number): AppError | undefined {
  const err = verifyHexString(txHash, index);
  if (err) {
    return err.addContext({ type: "txHash" });
  }

  if (txHash.substring(2).length !== 64) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: txHash,
      type: "txHash",
      reason: `expected hash length is 32, but got ${
        txHash.substring(2).length / 2
      }`,
    });
  }

  return undefined;
}

export function verifyBlockParameter(
  blockParameter: BlockParameter,
  index: number
): AppError | undefined {
  if (
    blockParameter === "latest" ||
    blockParameter === "earliest" ||
    blockParameter === "pending"
  ) {
    return undefined;
  }

  const err = verifyHexNumber(blockParameter, index);
  if (err) {
    return err.addContext({ type: "BlockParameter::Number" });
  }

  return undefined;
}

export function verifyOptEthCallObject(
  callObj: any,
  index: number
): AppError | undefined {
  if (typeof callObj !== "object") {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: callObj,
      reason: "not object type",
    });
  }

  const from = callObj.from;
  const to = callObj.to;
  const gasPrice = callObj.gasPrice;
  const gasLimit = callObj.gas;
  const value = callObj.value;
  const data = callObj.data;

  // validate `to`
  if (to != null) {
    const toErr = verifyAddress(to, index);
    if (toErr) {
      return toErr.addContext({ property: "to" });
    }
  }

  // validate `from`
  if (from != null) {
    const fromErr = verifyAddress(from, index);
    if (fromErr) {
      return fromErr.addContext({ property: "from" });
    }
  }

  // validate `gasPrice`
  if (gasPrice != null) {
    const gasErr = verifyHexNumber(gasPrice, index);
    if (gasErr) {
      return gasErr.addContext({ property: "gasPrice" });
    }
  }

  // validate `gasLimit`
  if (gasLimit != null) {
    const gasLimitErr = verifyGasLimit(gasLimit, index);
    if (gasLimitErr) {
      return gasLimitErr.addContext({ property: "gasLimit" });
    }
  }

  // validate `value`
  if (value != null) {
    const valueErr = verifyHexNumber(value, index);
    if (valueErr) {
      return valueErr.addContext({ property: "value" });
    }
  }

  // validate `data`
  if (data != null) {
    const dataErr = verifyHexString(data, index);
    if (dataErr) {
      return dataErr.addContext({ property: "data" });
    }
  }

  return undefined;
}

export function verifyEthCallObject(
  callObj: any,
  index: number
): AppError | undefined {
  const err = verifyOptEthCallObject(callObj, index);
  if (err) {
    return err;
  }

  // to is required
  if (callObj.to == null) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: callObj,
      reason: "eth_call requires callObj's 'to' property",
    });
  }

  return undefined;
}

export function verifyEstimateGasCallObject(
  callObj: any,
  index: number
): AppError | undefined {
  const err = verifyOptEthCallObject(callObj, index);
  if (err) {
    return err;
  }

  return undefined;
}

export function verifyStorageKey(
  key: string,
  index: number
): AppError | undefined {
  const err = verifyHexString(key, index);
  if (err) {
    return err;
  }
  return undefined;
}

export function verifyFilterTopicString(
  topic: any,
  index: number
): AppError | undefined {
  const err = verifyHexString(topic, index);
  if (err) {
    return err.addContext({ type: "topic" });
  }

  if (topic.substring(2).length !== 64) {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: topic,
      reason: `expected topic length is 32, but got ${
        topic.substring(2).length / 2
      }`,
    });
  }

  return undefined;
}

export function verifyFilterTopic(
  topic: any,
  index: number
): AppError | undefined {
  // topic type: export type FilterTopic = HexString | null | HexString[] (../src/cache/type.ts)
  if (!Array.isArray(topic)) {
    return verifyFilterTopicString(topic, index);
  }

  if (Array.isArray(topic)) {
    for (const t of topic) {
      const err = verifyFilterTopicString(t, index);
      if (err) {
        return err.addContext({ type: "topicString[]" });
      }
    }
  }

  return undefined;
}

export function verifyNewFilterObj(
  filterObj: any,
  index: number
): AppError | undefined {
  if (typeof filterObj !== "object") {
    return new AppError(ERRORS.INVALID_PARAMETER, {
      index,
      raw: filterObj,
      reason: "not object type",
    });
  }

  const fromBlock = filterObj.fromBlock;
  const toBlock = filterObj.toBlock;
  const address = filterObj.address;
  const topics = filterObj.topics;

  // validate `fromBlock`
  if (fromBlock != null) {
    const fromBlockErr = verifyBlockParameter(fromBlock, index);
    if (fromBlockErr) {
      return fromBlockErr.addContext({ property: "fromBlock" });
    }
  }

  // validate `toBlock`
  if (toBlock != null) {
    const toBlockErr = verifyBlockParameter(toBlock, index);
    if (toBlockErr) {
      return toBlockErr.addContext({ property: "toBlock" });
    }
  }

  // validate `address`
  if (address != null) {
    if (Array.isArray(address)) {
      for (const addr of address) {
        const addressErr = verifyAddress(addr, index);
        if (addressErr) {
          return addressErr.addContext({
            property: "address",
            type: "address[]",
          });
        }
      }
    } else {
      const addressErr = verifyAddress(address, index);
      if (addressErr) {
        return addressErr.addContext({ property: "address", type: "address" });
      }
    }
  }

  // validate `topics`
  if (topics != null) {
    if (!Array.isArray(topics)) {
      return new AppError(ERRORS.INVALID_PARAMETER, {
        index,
        raw: filterObj,
        property: "topics",
        reason: "not array type",
      });
    }
    for (const topic of topics) {
      const topicErr = verifyFilterTopic(topic, index);
      if (topicErr) {
        return topicErr.addContext({
          property: "topics",
          type: "topicString[]",
        });
      }
    }
  }

  return undefined;
}

export function verifyGasLimit(
  gasLimit: HexString,
  index: number
): AppError | undefined {
  const gasLimitErr = verifyHexNumber(gasLimit, index);
  if (gasLimitErr) {
    return gasLimitErr;
  }

  if (BigInt(gasLimit) > BigInt(RPC_MAX_GAS_LIMIT)) {
    return new AppError(ERRORS.GAS_LIMIT_TOO_LARGE, {
      index,
      gasLimit,
      limit: RPC_MAX_GAS_LIMIT,
    });
  }
  return undefined;
}

export function verifyContractCode(
  code: HexString,
  index: number
): AppError | undefined {
  const err = verifyHexString(code, index);
  if (err) {
    return err;
  }

  const codeSizeInByte = code.slice(2).length / 2;
  if (codeSizeInByte > POLY_MAX_CONTRACT_CODE_SIZE_IN_BYTE) {
    return new AppError(ERRORS.TRANSACTION_DATA_TOO_LARGE, {
      index,
      limit: POLY_MAX_CONTRACT_CODE_SIZE_IN_BYTE,
      actual: codeSizeInByte,
    });
  }

  return undefined;
}
//******* end of standalone verify function ********/
