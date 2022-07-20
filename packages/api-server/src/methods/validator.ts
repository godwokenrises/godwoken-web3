const newrelic = require("newrelic");
import {
  calcFee,
  calcIntrinsicGas,
  validateHexNumber,
  validateHexString,
} from "../util";
import { BlockParameter } from "./types";
import { logger } from "../base/logger";
import { InvalidParamsError, RpcError } from "./error";
import { CKB_SUDT_ID, RPC_MAX_GAS_LIMIT } from "./constant";
import { HexNumber, HexString } from "@ckb-lumos/base";
import { envConfig } from "../base/env-config";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { EthRegistryAddress } from "../base/address";

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
      return await newrelic.startSegment(method.name, true, async () => {
        return await method(params);
      });
    } catch (err: any) {
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
export function verifyBoolean(
  bool: any,
  index: number
): InvalidParamsError | undefined {
  if (typeof bool !== "boolean") {
    return invalidParamsError(index, `argument is not boolean`);
  }
  return undefined;
}

export function verifyHexNumber(
  hexNumber: string,
  index: number
): InvalidParamsError | undefined {
  if (typeof hexNumber !== "string") {
    return invalidParamsError(
      index,
      `hexNumber argument must be a string type`
    );
  }

  if (!hexNumber.startsWith("0x")) {
    return invalidParamsError(index, `hexNumber without 0x prefix`);
  }

  if (!validateHexNumber(hexNumber)) {
    return invalidParamsError(index, `invalid hexNumber token`);
  }

  return undefined;
}

export function verifyHexString(
  hexString: any,
  index: number
): InvalidParamsError | undefined {
  if (typeof hexString !== "string") {
    return invalidParamsError(
      index,
      `hexString argument must be a string type`
    );
  }

  if (!hexString.startsWith("0x")) {
    return invalidParamsError(index, `hexString without 0x prefix`);
  }

  if (hexString.length % 2 !== 0) {
    return invalidParamsError(index, `hexString must has even length`);
  }

  if (!validateHexString(hexString)) {
    return invalidParamsError(index, `invalid hexString token`);
  }

  return undefined;
}

export function verifyAddress(
  address: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyHexString(address, index);
  if (err) {
    return err.padContext("address");
  }

  if (address.substring(2).length !== 40) {
    return invalidParamsError(
      index,
      `expect address has 20 bytes, but getting ${
        address.substring(2).length / 2
      } bytes`
    );
  }

  return undefined;
}

export function verifyBlockHash(
  blockHash: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyHexString(blockHash, index);
  if (err) {
    return err.padContext("blockHash");
  }

  if (blockHash.substring(2).length !== 64) {
    return invalidParamsError(
      index,
      `expect blockHash has 32 bytes, but getting ${
        blockHash.substring(2).length / 2
      } bytes`
    );
  }

  return undefined;
}

export function verifyTxHash(
  txHash: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyHexString(txHash, index);
  if (err) {
    return err.padContext("txHash");
  }

  if (txHash.substring(2).length !== 64) {
    return invalidParamsError(
      index,
      `expect txHash has 32 bytes, but getting ${
        txHash.substring(2).length / 2
      } bytes`
    );
  }

  return undefined;
}

export function verifyBlockParameter(
  blockParameter: BlockParameter,
  index: number
): InvalidParamsError | undefined {
  if (
    blockParameter === "latest" ||
    blockParameter === "earliest" ||
    blockParameter === "pending"
  ) {
    return undefined;
  }

  const err = verifyHexNumber(blockParameter, index);
  if (err) {
    return err.padContext("blockParameter block number");
  }

  return undefined;
}

export function verifyOptEthCallObject(
  callObj: any,
  index: number
): InvalidParamsError | undefined {
  if (typeof callObj !== "object") {
    return invalidParamsError(index, `argument must be an object`);
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
      return toErr.padContext("callObj to address");
    }
  }

  // validate `from`
  if (from != null) {
    const fromErr = verifyAddress(from, index);
    if (fromErr) {
      return fromErr.padContext("callObj from address");
    }
  }

  // validate `gasPrice`
  if (gasPrice != null) {
    const gasErr = verifyHexNumber(gasPrice, index);
    if (gasErr) {
      return gasErr.padContext("callObj gasPrice");
    }
  }

  // validate `gasLimit`
  if (gasLimit != null) {
    const gasLimitErr = verifyGasLimit(gasLimit, index);
    if (gasLimitErr) {
      return gasLimitErr.padContext("callObj");
    }
  }

  // validate `value`
  if (value != null) {
    const valueErr = verifyHexNumber(value, index);
    if (valueErr) {
      return valueErr.padContext("callObj value");
    }
  }

  // validate `data`
  if (data != null) {
    const dataErr = verifyHexString(data, index);
    if (dataErr) {
      return dataErr.padContext("callObj data");
    }
  }

  return undefined;
}

export function verifyEthCallObject(
  callObj: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyOptEthCallObject(callObj, index);
  if (err) {
    return err.padContext("eth_call");
  }

  // to is required
  if (callObj.to == null) {
    return invalidParamsError(index, `eth_call to address is required!`);
  }

  return undefined;
}

export function verifyEstimateGasCallObject(
  callObj: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyOptEthCallObject(callObj, index);
  if (err) {
    return err.padContext("eth_estimateGas");
  }

  return undefined;
}

export function verifyStorageKey(
  key: string,
  index: number
): InvalidParamsError | undefined {
  const err = verifyHexString(key, index);
  if (err) {
    return err.padContext("storageKey");
  }
  return undefined;
}

export function verifyFilterTopicString(
  topic: any,
  index: number
): InvalidParamsError | undefined {
  const err = verifyHexString(topic, index);
  if (err) {
    return err.padContext("topic string");
  }

  if (topic.substring(2).length !== 64) {
    return invalidParamsError(
      index,
      `expect topic string has 32 bytes, but getting ${
        topic.substring(2).length / 2
      } bytes`
    );
  }

  return undefined;
}

export function verifyFilterTopic(
  topic: any,
  index: number
): InvalidParamsError | undefined {
  // topic type: export type FilterTopic = HexString | null | HexString[] (../src/cache/type.ts)
  if (!Array.isArray(topic)) {
    return topic == null ? undefined : verifyFilterTopicString(topic, index);
  }

  for (const t of topic) {
    if (t == null) continue;

    const err = verifyFilterTopicString(t, index);
    if (err) {
      return err.padContext("topicString[] array");
    }
  }

  return undefined;
}

export function verifyNewFilterObj(
  filterObj: any,
  index: number
): InvalidParamsError | undefined {
  if (typeof filterObj !== "object") {
    return invalidParamsError(index, `filter argument must be an object`);
  }

  const fromBlock = filterObj.fromBlock;
  const toBlock = filterObj.toBlock;
  const address = filterObj.address;
  const topics = filterObj.topics;

  // validate `fromBlock`
  if (fromBlock != null) {
    const fromBlockErr = verifyBlockParameter(fromBlock, index);
    if (fromBlockErr) {
      return fromBlockErr.padContext("filter fromBlock");
    }
  }

  // validate `toBlock`
  if (toBlock != null) {
    const toBlockErr = verifyBlockParameter(toBlock, index);
    if (toBlockErr) {
      return toBlockErr.padContext("filter toBlock");
    }
  }

  // validate `address`
  if (address != null) {
    if (Array.isArray(address)) {
      for (const addr of address) {
        const addressErr = verifyAddress(addr, index);
        if (addressErr) {
          return addressErr.padContext("filter address[] Array");
        }
      }
    } else {
      const addressErr = verifyAddress(address, index);
      if (addressErr) {
        return addressErr.padContext("filter address");
      }
    }
  }

  // validate `topics`
  if (topics != null) {
    if (!Array.isArray(topics)) {
      return invalidParamsError(index, `filter topics must be an array`);
    }
    for (const topic of topics) {
      const topicErr = verifyFilterTopic(topic, index);
      if (topicErr) {
        return topicErr.padContext("filter topic[] Array");
      }
    }
  }

  return undefined;
}

export function verifyGasLimit(
  gasLimit: HexNumber,
  index: number
): InvalidParamsError | undefined {
  const gasLimitErr = verifyHexNumber(gasLimit, index);
  if (gasLimitErr) {
    return gasLimitErr.padContext("gasLimit");
  }

  if (BigInt(gasLimit) > BigInt(RPC_MAX_GAS_LIMIT)) {
    return invalidParamsError(
      index,
      `gas limit ${gasLimit} exceeds rpc gas limit of ${RPC_MAX_GAS_LIMIT}`
    );
  }
  return undefined;
}

export function verifyGasPrice(
  gasPrice: HexNumber,
  index: number
): InvalidParamsError | undefined {
  const gasPriceErr = verifyHexNumber(gasPrice, index);
  if (gasPriceErr) {
    return gasPriceErr.padContext("gasPrice");
  }

  if (
    envConfig.minGasPrice != null &&
    BigInt(gasPrice) < BigInt(envConfig.minGasPrice)
  ) {
    return invalidParamsError(
      index,
      `minimal gas price ${envConfig.minGasPrice} required. got ${BigInt(
        gasPrice
      ).toString(10)}`
    );
  }
  return undefined;
}

export function verifyL2TxFee(
  fee: HexNumber,
  serializedL2Tx: HexString,
  index: number
): InvalidParamsError | undefined {
  const feeErr = verifyHexNumber(fee, index);
  if (feeErr) {
    return feeErr.padContext("L2Tx Fee");
  }
  const txErr = verifyHexString(serializedL2Tx, index);
  if (txErr) {
    return txErr.padContext("L2Tx Fee");
  }

  const feeRate = BigInt(envConfig.feeRate || 0);
  const requiredFee = calcFee(serializedL2Tx, feeRate);
  if (BigInt(fee) < requiredFee) {
    return invalidParamsError(
      index,
      `minimal l2tx fee ${requiredFee.toString(10)} required. got ${BigInt(
        fee
      ).toString(10)}`
    );
  }
  return undefined;
}

export function verifyIntrinsicGas(
  to: HexString | undefined,
  input: HexString | undefined,
  gas: HexNumber,
  index: number
) {
  const intrinsicGas = calcIntrinsicGas(to, input);
  if (BigInt(gas) < intrinsicGas) {
    return invalidParamsError(
      index,
      `intrinsic Gas too low ${gas.toString()}, require ${intrinsicGas.toString()}`
    );
  }
  return undefined;
}

export async function verifyEnoughBalance(
  rpc: GodwokenClient,
  from: HexString,
  value: HexNumber | undefined,
  gas: HexNumber | undefined,
  gasPrice: HexNumber | undefined,
  index: number
) {
  const registryAddress: EthRegistryAddress = new EthRegistryAddress(from);
  const balance = await rpc.getBalance(
    registryAddress.serialize(),
    +CKB_SUDT_ID
  );
  const txValue = value == null || value === "0x" ? 0 : value;
  const txGas = gas == null || gas === "0x" ? 0 : +gas;
  const txGasPrice = gasPrice == null || gasPrice === "0x" ? 0 : +gasPrice;
  const requireBalance = BigInt(txGas * txGasPrice) + BigInt(txValue);

  if (balance < requireBalance) {
    return invalidParamsError(
      index,
      `insufficient balance, require ${requireBalance.toString()}, got ${balance}`
    );
  }
  return undefined;
}
//******* end of standalone verify function ********/

// some utils function
function invalidParamsError(index: number, message: string) {
  return new InvalidParamsError(`invalid argument ${index}: ${message}`);
}
