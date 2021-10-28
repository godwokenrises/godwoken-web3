import { validateHexNumber, validateHexString } from "../util";
import { BlockParameter } from "./types";
import { logger } from "../base/logger";
import { InvalidParamsError, RpcError } from "./error";

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
      throw new InvalidParamsError(
        `missing value for required argument ${params.length}`
      );
    }

    for (let i = 0; i < validators.length; i++) {
      if (!validators[i]) {
        throw new Error(`validator ${i} not found!`);
      }

      const err = validators[i](params, i);
      if (err) {
        throw new RpcError(err.code, err.message, err.data);
      }
    }

    try {
      return await method(params);
    } catch (err) {
      logger.error(
        `JSONRPC Server Error: [${method.name}] ${err} ${err.stack}`
      );
      throw new RpcError(err.code, err.message, err.data);
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
  hexString(params: any[], index: number): any {
    return verifyHexString(params[index], index);
  },

  hexNumber(params: any[], index: number): any {
    return verifyHexNumber(params[index], index);
  },

  /**
   * Hex number | "latest" | "earliest" | "pending"
   * @param params
   * @param index
   * @returns
   */
  blockParameter(params: any[], index: number): any {
    return verifyBlockParameter(params[index], index);
  },

  /**
   * hex validator to validate block hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  blockHash(params: any[], index: number): any {
    if (typeof params[index] !== "string") {
      return invalidParamsError(index, `argument must be a hex string`);
    }

    const blockHash = params[index].substring(2);

    if (!/^[0-9a-fA-F]+$/.test(blockHash) || blockHash.length !== 64) {
      return invalidParamsError(index, `invalid block hash`);
    }

    return undefined;
  },

  /**
   * hex validator to validate transaction hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  txHash(params: any[], index: number): any {
    if (typeof params[index] !== "string") {
      return invalidParamsError(index, `argument must be a hex string`);
    }

    const txHash = params[index].substring(2);

    if (!/^[0-9a-fA-F]+$/.test(txHash) || txHash.length !== 64) {
      return invalidParamsError(index, `invalid transaction hash`);
    }

    return undefined;
  },

  /**
   * hex validator to validate block hash
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  address(params: any[], index: number): any {
    return verifyAddress(params[index], index);
  },

  /**
   * bool validator to check if type is boolean
   * @param {any[]} params parameters of method
   * @param {number} index index of parameter
   */
  bool(params: any[], index: number): any {
    if (typeof params[index] !== "boolean") {
      return invalidParamsError(index, `argument is not boolean`);
    }
    return undefined;
  },

  //TODO: estimateGas `to` is optional
  ethCallParams(params: any[], index: number): any {
    const targetParam = params[index];
    if (typeof targetParam !== "object") {
      return invalidParamsError(index, `argument must be an object`);
    }

    const from = targetParam.from;
    const to = targetParam.to;
    const gas = targetParam.gas;
    const gasLimit = targetParam.gasLimit;
    const value = targetParam.value;
    const data = targetParam.data;

    // validate `to`
    if (to !== undefined && to !== null) {
      const toErr = verifyAddress(to, index);
      if (toErr !== undefined) {
        return toErr;
      }
    }

    // validate `from`
    if (from !== undefined && from !== null) {
      const fromErr = verifyAddress(from, index);
      if (fromErr !== undefined) {
        return fromErr;
      }
    }

    // validate `gas`
    if (gas !== undefined && gas !== null) {
      const gasErr = verifyHexNumber(gas, index);
      if (gasErr !== undefined) {
        return gasErr;
      }
    }

    // validate `gasLimit`
    if (gasLimit !== undefined && gasLimit !== null) {
      const gasLimitErr = verifyHexNumber(gasLimit, index);
      if (gasLimitErr !== undefined) {
        return gasLimitErr;
      }
    }

    // validate `value`
    if (value !== undefined && value !== null) {
      const valueErr = verifyHexNumber(value, index);
      if (valueErr !== undefined) {
        return valueErr;
      }
    }

    // validate `data`
    if (data !== undefined && data !== null) {
      const dataErr = verifyHexString(data, index);
      if (dataErr !== undefined) {
        return dataErr;
      }
    }

    return undefined;
  },

  newFilterParams(params: any[], index: number): any {
    const targetParam = params[index];
    if (typeof targetParam !== "object") {
      return invalidParamsError(index, `argument must be an object`);
    }

    const fromBlock = targetParam.fromBlock;
    const toBlock = targetParam.toBlock;
    const address = targetParam.address;
    const topics = targetParam.topics;

    // validate `fromBlock`
    if (fromBlock !== undefined && fromBlock !== null) {
      const fromBlockErr = verifyBlockParameter(fromBlock, index);
      if (fromBlockErr !== undefined) {
        return fromBlockErr;
      }
    }

    // validate `toBlock`
    if (toBlock !== undefined && toBlock !== null) {
      const toBlockErr = verifyBlockParameter(toBlock, index);
      if (toBlockErr !== undefined) {
        return toBlockErr;
      }
    }

    // validate `address`
    if (address !== undefined && address !== null) {
      const addressErr = verifyAddress(address, index);
      if (addressErr !== undefined) {
        return addressErr;
      }
    }

    // validate `topics`
    if (topics !== undefined && topics !== null) {
      if (!Array.isArray(topics)) {
        return invalidParamsError(index, `argument must be an array`);
      }
      for (const topic of topics) {
        verifyFilterTopic(topic, index);
      }
    }

    return undefined;
  },
};

function verifyAddress(address: any, index: number): any {
  if (typeof address !== "string") {
    return invalidParamsError(index, `argument must be a hex string`);
  }

  if (!validateAddress(address)) {
  }

  return undefined;
}

function verifyHexNumber(hexNumber: string, index: number) {
  if (typeof hexNumber !== "string") {
    return invalidParamsError(index, `argument must be a hex string`);
  }

  if (!hexNumber.startsWith("0x")) {
    return invalidParamsError(index, `hex string without 0x prefix`);
  }

  if (hexNumber.startsWith("0x0") && hexNumber !== "0x0") {
    return invalidParamsError(index, `hex number with leading zero digits`);
  }

  if (!validateHexNumber(hexNumber)) {
    return invalidParamsError(index, `invalid hex number`);
  }

  return undefined;
}

function verifyBlockParameter(
  blockParameter: BlockParameter,
  index: number
): any {
  if (
    blockParameter === "latest" ||
    blockParameter === "earliest" ||
    blockParameter === "pending"
  ) {
    return undefined;
  }

  if (typeof blockParameter !== "string") {
    return invalidParamsError(
      index,
      `argument must be a hex number, "latest", "earliest" or "pending".`
    );
  }

  return verifyHexNumber(blockParameter, index);
}

function verifyHexString(hexString: any, index: number): any {
  if (typeof hexString !== "string") {
    return invalidParamsError(index, `argument must be a hex string`);
  }

  if (!hexString.startsWith("0x")) {
    return invalidParamsError(index, `hex string without 0x prefix`);
  }

  if (!validateHexString(hexString)) {
    return invalidParamsError(index, `invalid hex string`);
  }

  return undefined;
}

function verifyFilterTopic(topic: any, index: number): any {
  // topic type: export type FilterTopic = HexString | null | HexString[] (../src/cache/type.ts)
  if (!Array.isArray(topic)) {
    if ((!validateHexString(topic) || topic.length !== 66) && topic !== null) {
      return invalidParamsError(index, `invalid argument`);
    }
  }

  if (Array.isArray(topic)) {
    for (const t of topic) {
      if ((!validateHexString(t) || t.length !== 66) && t !== null) {
        return invalidParamsError(index, `invalid argument`);
      }
    }
  }

  return undefined;
}

function validateAddress(address: string): boolean {
  return /^0x[0-9a-fA-F]+$/.test(address) && address.length === 42;
}

function invalidParamsError(index: number, message: string): void {
  throw new InvalidParamsError(`invalid argument ${index}: ${message}`);
}
