import {
  Callback,
  GodwokenLog,
  LogItem,
  SudtOperationLog,
  PolyjuiceSystemLog,
  PolyjuiceUserLog,
  TransactionCallObject,
  SudtPayFeeLog,
  BlockParameter,
} from "../types";
import { middleware, validators } from "../validator";
import { FilterObject } from "../../cache/types";
import { utils, HexNumber, Hash } from "@ckb-lumos/base";
import { RawL2Transaction } from "@godwoken-web3/godwoken";
import { Script } from "@ckb-lumos/base";
import {
  METHOD_NOT_SUPPORT,
  WEB3_ERROR,
  HEADER_NOT_FOUND_ERROR,
} from "../error-code";
import {
  CKB_SUDT_ID,
  HEADER_NOT_FOUND_ERR_MESSAGE,
  POLYJUICE_CONTRACT_CODE,
  POLYJUICE_SYSTEM_PREFIX,
  SUDT_OPERATION_LOG_FLGA,
  SUDT_PAY_FEE_LOG_FLAG,
  POLYJUICE_SYSTEM_LOG_FLAG,
  POLYJUICE_USER_LOG_FLAG,
} from "../constant";
import { Query } from "../../db";
import { envConfig } from "../../base/env-config";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { Uint128, Uint32, Uint64 } from "../../base/types/uint";
import {
  toApiBlock,
  toApiLog,
  toApiTransaction,
  toApiTransactioReceipt,
} from "../../db/types";

const Config = require("../../../config/eth.json");

type U32 = number;
type U64 = bigint;

const EMPTY_ADDRESS = "0x" + "00".repeat(20);

export class Eth {
  private query: Query;
  private rpc: GodwokenClient;

  constructor() {
    this.query = new Query(envConfig.databaseUrl);
    this.rpc = new GodwokenClient(envConfig.godwokenJsonRpc);

    this.getBlockByNumber = middleware(this.getBlockByNumber.bind(this), 2, [
      validators.blockParameter,
      validators.bool,
    ]);
    this.getBlockByHash = middleware(this.getBlockByHash.bind(this), 2, [
      validators.blockHash,
      validators.bool,
    ]);
    this.getBalance = middleware(this.getBalance.bind(this), 2, [
      validators.address,
      validators.blockParameter,
    ]);
    this.getStorageAt = middleware(this.getStorageAt.bind(this), 3, [
      validators.address,
      validators.hexNumber,
      validators.blockParameter,
    ]);
    this.getTransactionCount = middleware(
      this.getTransactionCount.bind(this),
      2,
      [validators.address, validators.blockParameter]
    );
    this.getBlockTransactionCountByHash = middleware(
      this.getBlockTransactionCountByHash.bind(this),
      1,
      [validators.blockHash]
    );
    this.getBlockTransactionCountByNumber = middleware(
      this.getBlockTransactionCountByNumber.bind(this),
      1,
      [validators.blockParameter]
    );
    this.getUncleCountByBlockHash = middleware(
      this.getUncleCountByBlockHash.bind(this),
      1,
      [validators.blockHash]
    );
    this.getUncleCountByBlockNumber = middleware(
      this.getUncleCountByBlockNumber.bind(this),
      1,
      [validators.blockParameter]
    );
    this.getCode = middleware(this.getCode.bind(this), 2, [
      validators.address,
      validators.blockParameter,
    ]);
    this.getTransactionByHash = middleware(
      this.getTransactionByHash.bind(this),
      1,
      [validators.txHash]
    );
    this.getTransactionByBlockHashAndIndex = middleware(
      this.getTransactionByBlockHashAndIndex.bind(this),
      2,
      [validators.blockHash, validators.hexNumber]
    );
    this.getTransactionByBlockNumberAndIndex = middleware(
      this.getTransactionByBlockNumberAndIndex.bind(this),
      2,
      [validators.blockParameter, validators.hexNumber]
    );
    this.getTransactionReceipt = middleware(
      this.getTransactionReceipt.bind(this),
      1,
      [validators.txHash]
    );
    this.getUncleByBlockHashAndIndex = middleware(
      this.getUncleByBlockHashAndIndex.bind(this),
      2,
      [validators.blockHash, validators.hexNumber]
    );
    this.getUncleByBlockNumberAndIndex = middleware(
      this.getUncleByBlockNumberAndIndex.bind(this),
      2,
      [validators.blockParameter, validators.hexNumber]
    );
    this.call = middleware(this.call.bind(this), 2, [
      validators.ethCallParams,
      validators.blockParameter,
    ]);
    this.estimateGas = middleware(this.estimateGas.bind(this), 1, [
      validators.ethCallParams,
    ]);
    // this.newFilter = middleware(this.newFilter.bind(this), 1, [
    //   validators.newFilterParams,
    // ]);

    this.sendRawTransaction = middleware(
      this.sendRawTransaction.bind(this),
      1,
      [validators.hexString]
    );

    //
    this.syncing = middleware(this.syncing.bind(this), 0);

    this.coinbase = middleware(this.coinbase.bind(this), 0);

    this.mining = middleware(this.mining.bind(this), 0);

    this.blockNumber = middleware(this.blockNumber.bind(this), 0);

    this.sign = middleware(this.sign.bind(this), 0);

    this.signTransaction = middleware(this.signTransaction.bind(this), 0);

    this.sendTransaction = middleware(this.sendTransaction.bind(this), 0);
  }

  chainId(args: [], callback: Callback) {
    callback(null, "0x" + BigInt(envConfig.chainId).toString(16));
  }

  /**
   * Returns the current protocol version
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * protocol version as the second argument
   */
  protocolVersion(args: [], callback: Callback) {
    const version = "0x" + BigInt(Config.eth_protocolVersion).toString(16);
    callback(null, version);
  }

  /**
   * Returns block syning info
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * SyningStatus as the second argument.
   *    SyningStatus: false or { startingBlock, currentBlock, highestBlock }
   */
  async syncing(args: [], callback: Callback) {
    // TODO get the latest L2 block number
    const tipNumber = await this.query.getTipBlockNumber();
    if (tipNumber == null) {
      return callback(null, false);
    }
    const blockHeight: HexNumber = new Uint64(tipNumber).toHex();
    const result = {
      startingBlock: blockHeight,
      currentBlock: blockHeight,
      highestBlock: blockHeight,
    };
    callback(null, result);
  }

  /**
   * Returns client coinbase address, which is always zero hashes
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 20 bytes 0 hex string as the second argument.
   */
  coinbase(args: [], callback: Callback) {
    callback(null, EMPTY_ADDRESS);
  }

  /**
   * Returns if client is mining, which is always false
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * false as the second argument.
   */
  mining(args: [], callback: Callback) {
    callback(null, false);
  }

  /**
   * Returns client mining hashrate, which is always 0x0
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 0x0 as the second argument.
   */
  hashrate(args: [], callback: Callback) {
    callback(null, "0x0");
  }

  async gasPrice(args: [], callback: Callback) {
    callback(null, "0x1");
  }

  /**
   * Returns client saved wallet addresses, which is always zero array
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * [] as the second argument.
   */
  accounts(args: [], callback: Callback) {
    callback(null, []);
  }

  async blockNumber(args: [], callback: Callback) {
    const tipBlockNumber = await this.query.getTipBlockNumber();
    if (tipBlockNumber == null) {
      return callback(null, null);
    }
    const blockHeight: HexNumber = new Uint64(tipBlockNumber).toHex();
    callback(null, blockHeight);
  }

  async sign(_args: any[], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_sign is not supported!",
    });
  }

  async signTransaction(_args: any[], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_signTransaction is not supported!",
    });
  }

  async sendTransaction(_args: any[], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_sendTransaction is not supported!",
    });
  }

  // TODO: second arguments
  async getBalance(args: [string, string], callback: Callback) {
    try {
      const address = args[0];
      const blockParameter = args[1];
      let blockNumber: bigint | undefined;
      try {
        blockNumber = await this.parseBlockParameter(blockParameter);
      } catch (err) {
        return callback({
          code: HEADER_NOT_FOUND_ERROR,
          message: err.message,
        });
      }
      const shortAddress = await allTypeEthAddressToShortAddress(
        this.rpc,
        address
      );
      if (shortAddress == null) {
        return callback(null, "0x0");
      }
      console.log(`eth_address: ${address}, short_address: ${shortAddress}`);
      const balance = await this.rpc.getBalance(
        shortAddress,
        +CKB_SUDT_ID,
        blockNumber
      );
      const balanceHex = new Uint128(balance).toHex();
      callback(null, balanceHex);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async getStorageAt(args: [string, string, string], callback: Callback) {
    try {
      const address = args[0];
      const storagePosition = args[1];
      const blockParameter = args[2];
      let blockNumber: U64 | undefined;
      try {
        blockNumber = await this.parseBlockParameter(blockParameter);
      } catch (err) {
        return callback({
          code: HEADER_NOT_FOUND_ERROR,
          message: err.message,
        });
      }
      const accountId: U32 | undefined = await ethContractAddressToAccountId(
        address,
        this.rpc
      );
      if (accountId == null) {
        return callback(
          null,
          "0x0000000000000000000000000000000000000000000000000000000000000000"
        );
      }

      const key = buildStorageKey(storagePosition);
      const value = await this.rpc.getStorageAt(accountId, key, blockNumber);
      callback(null, value);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  /**
   *
   * @param args [address, QUANTITY|TAG]
   * @param callback
   */
  async getTransactionCount(args: [string, string], callback: Callback) {
    try {
      const address = args[0];
      const blockParameter = args[1];
      let blockNumber: U64 | undefined;
      try {
        blockNumber = await this.parseBlockParameter(blockParameter);
      } catch (err) {
        return callback({
          code: HEADER_NOT_FOUND_ERROR,
          message: err.message,
        });
      }
      const accountId: number | undefined = await allTypeEthAddressToAccountId(
        this.rpc,
        address
      );
      if (accountId == null) {
        callback(null, "0x0");
        return;
      }
      const nonce = await this.rpc.getNonce(accountId, blockNumber);
      const transactionCount = new Uint32(nonce).toHex();
      callback(null, transactionCount);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async getCode(args: [string, string], callback: Callback) {
    try {
      const defaultResult = "0x";

      const address = args[0];
      const blockParameter = args[1];
      let blockNumber: U64 | undefined;
      try {
        blockNumber = await this.parseBlockParameter(blockParameter);
      } catch (err) {
        return callback({
          code: HEADER_NOT_FOUND_ERROR,
          message: err.message,
        });
      }
      const accountId = await ethContractAddressToAccountId(address, this.rpc);
      if (accountId == null) {
        callback(null, defaultResult);
        return;
      }
      const contractCodeKey = polyjuiceBuildContractCodeKey(accountId);
      const dataHash = await this.rpc.getStorageAt(
        accountId,
        contractCodeKey,
        blockNumber
      );
      const data = await this.rpc.getData(dataHash, blockNumber);
      callback(null, data || defaultResult);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async call(args: [TransactionCallObject, string], callback: Callback) {
    try {
      const blockParameter = args[1];
      let blockNumber: U64 | undefined;
      try {
        blockNumber = await this.parseBlockParameter(blockParameter);
      } catch (err) {
        return callback({
          code: HEADER_NOT_FOUND_ERROR,
          message: err.message,
        });
      }
      const rawL2TransactionHex = await buildEthCallTx(args[0], this.rpc);
      const runResult = await this.rpc.executeRawL2Transaction(
        rawL2TransactionHex,
        blockNumber
      );
      console.log("RunResult:", runResult);
      callback(null, runResult.return_data);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async estimateGas(args: [TransactionCallObject], callback: Callback) {
    try {
      const rawL2Transaction = await buildEthCallTx(args[0], this.rpc);
      const runResult = await this.rpc.executeRawL2Transaction(
        rawL2Transaction
      );

      const polyjuiceSystemLog = extractPolyjuiceSystemLog(
        runResult.logs
      ) as PolyjuiceSystemLog;

      console.log(polyjuiceSystemLog);

      console.log(
        "eth_estimateGas RunResult:",
        runResult,
        "0x" + BigInt(polyjuiceSystemLog.gasUsed).toString(16)
      );

      callback(null, "0x" + BigInt(polyjuiceSystemLog.gasUsed).toString(16));
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async getBlockByHash(args: [string, boolean], callback: Callback) {
    try {
      const blockHash = args[0];
      const isFullTransaction = args[1];

      const block = await this.query.getBlockByHash(blockHash);
      if (block == null) {
        return callback(null, null);
      }

      if (isFullTransaction) {
        const txs = await this.query.getTransactionsByBlockHash(blockHash);
        const apiTxs = txs.map((tx) => toApiTransaction(tx));
        const apiBlock = toApiBlock(block, apiTxs);
        callback(null, apiBlock);
      } else {
        const txHashes: Hash[] =
          await this.query.getTransactionHashesByBlockHash(blockHash);
        const apiBlock = toApiBlock(block, txHashes);
        callback(null, apiBlock);
      }
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  async getBlockByNumber(args: [string, boolean], callback: Callback) {
    const blockParameter = args[0];
    const isFullTransaction = args[1];
    let blockNumber: U64 | undefined;
    try {
      blockNumber = await this.blockParameterToBlockNumber(blockParameter);
    } catch (err) {
      return callback({
        code: HEADER_NOT_FOUND_ERROR,
        message: err.message,
      });
    }

    const block = await this.query.getBlockByNumber(blockNumber);
    if (block == null) {
      return callback(null, null);
    }

    const apiBlock = toApiBlock(block);
    if (isFullTransaction) {
      const txs = await this.query.getTransactionsByBlockNumber(blockNumber);
      const apiTxs = txs.map((tx) => toApiTransaction(tx));
      apiBlock.transactions = apiTxs;
    } else {
      const txHashes: Hash[] =
        await this.query.getTransactionHashesByBlockNumber(blockNumber);
      apiBlock.transactions = txHashes;
    }
    callback(null, apiBlock);
  }

  /**
   *
   * @param args [blockHash]
   * @param callback
   */
  async getBlockTransactionCountByHash(args: [string], callback: Callback) {
    const blockHash: Hash = args[0];

    const txCount = await this.query.getBlockTransactionCountByHash(blockHash);
    const txCountHex = new Uint32(txCount).toHex();

    callback(null, txCountHex);
  }

  /**
   *
   * @param args [blockNumber]
   * @param callback
   */
  async getBlockTransactionCountByNumber(args: [string], callback: Callback) {
    const blockParameter = args[0];
    let blockNumber: U64 | undefined;
    try {
      blockNumber = await this.blockParameterToBlockNumber(blockParameter);
    } catch (err) {
      return callback({
        code: HEADER_NOT_FOUND_ERROR,
        message: err.message,
      });
    }

    const txCount = await this.query.getBlockTransactionCountByNumber(
      blockNumber
    );
    const txCountHex: HexNumber = new Uint32(txCount).toHex();
    callback(null, txCountHex);
  }

  async getUncleByBlockHashAndIndex(
    args: [string, string],
    callback: Callback
  ) {
    callback(null, null);
  }

  async getUncleByBlockNumberAndIndex(
    args: [string, string],
    callback: Callback
  ) {
    callback(null, null);
  }

  /**
   *
   * @param args [blockHash]
   * @param callback
   */
  async getUncleCountByBlockHash(args: [string], callback: Callback) {
    callback(null, "0x0");
  }

  /**
   *
   * @param args [blockNumber]
   * @param callback
   */
  async getUncleCountByBlockNumber(args: [string], callback: Callback) {
    callback(null, "0x0");
  }

  async getCompilers(args: [], callback: Callback) {
    callback(null, []);
  }

  async getTransactionByHash(args: [string], callback: Callback) {
    const txHash: Hash = args[0];

    const tx = await this.query.getTransactionByHash(txHash);
    if (tx == null) {
      return callback(null, null);
    }
    const apiTx = toApiTransaction(tx);
    callback(null, apiTx);
  }

  /**
   *
   * @param args [blockHash, index]
   * @param callback
   */
  async getTransactionByBlockHashAndIndex(
    args: [string, string],
    callback: Callback
  ) {
    const blockHash: Hash = args[0];
    const index = +args[1];

    const tx = await this.query.getTransactionByBlockHashAndIndex(
      blockHash,
      index
    );
    if (tx == null) {
      return callback(null, null);
    }
    const apiTx = toApiTransaction(tx);
    callback(null, apiTx);
  }

  async getTransactionByBlockNumberAndIndex(
    args: [string, string],
    callback: Callback
  ) {
    const blockParameter = args[0];
    const index: U32 = +args[1];
    let blockNumber: U64 | undefined;
    try {
      blockNumber = await this.blockParameterToBlockNumber(blockParameter);
    } catch (err) {
      return callback({
        code: HEADER_NOT_FOUND_ERROR,
        message: err.message,
      });
    }

    const tx = await this.query.getTransactionByBlockNumberAndIndex(
      blockNumber,
      index
    );

    if (tx == null) {
      return callback(null, null);
    }

    const apiTx = toApiTransaction(tx);
    callback(null, apiTx);
  }

  async getTransactionReceipt(args: [string], callback: Callback) {
    const txHash: Hash = args[0];

    const data = await this.query.getTransactionAndLogsByHash(txHash);
    if (data == null) {
      return callback(null, null);
    }

    const [tx, logs] = data;
    const apiLogs = logs.map((log) => toApiLog(log));
    const transactionReceipt = toApiTransactioReceipt(tx, apiLogs);
    callback(null, transactionReceipt);
  }

  /* #region filter-related api methods */
  newFilter(args: [FilterObject], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_newFilter is not supported!",
    });
  }

  newBlockFilter(args: [], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_newBlockFilter is not supported!",
    });
  }

  newPendingTransactionFilter(args: [], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_newPendingTransactionFilter is not supported!",
    });
  }

  uninstallFilter(args: [string], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_uninstallFilter is not supported!",
    });
  }

  async getFilterLogs(args: [string], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_getFilterLogs is not supported!",
    });
  }

  async getFilterChanges(args: [string], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_getFilterChanges is not supported!",
    });
  }

  async getLogs(args: [FilterObject], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_getLogs is not supported!",
    });
  }

  async sendRawTransaction(args: [string], callback: Callback) {
    callback({
      code: METHOD_NOT_SUPPORT,
      message: "eth_sendRawTransaction is not supported!",
    });
  }
  /* #endregion */

  private async getTipNumber(): Promise<U64> {
    const num = await this.query.getTipBlockNumber();
    if (num == null) {
      throw new Error("tip block number not found!!");
    }
    return num;
  }

  private async parseBlockParameter(
    blockParameter: BlockParameter
  ): Promise<bigint | undefined> {
    switch (blockParameter) {
      case "latest":
        return undefined;
      case "earliest":
        return 0n;
      // It's supposed to be filtered in the validator, so throw an error if matched
      case "pending":
        //throw new Error("block parameter should not be pending.");
        return undefined;
    }

    const tipNumber: bigint = await this.getTipNumber();
    const blockNumber: U64 = Uint64.fromHex(blockParameter).getValue();
    if (tipNumber < blockNumber) {
      throw new Error(HEADER_NOT_FOUND_ERR_MESSAGE);
    }
    return blockNumber;
  }

  private async blockParameterToBlockNumber(
    blockParameter: BlockParameter
  ): Promise<U64> {
    const blockNumber: U64 | undefined = await this.parseBlockParameter(
      blockParameter
    );
    if (blockNumber === undefined) {
      return await this.getTipNumber();
    }
    return blockNumber;
  }
}

async function allTypeEthAddressToShortAddress(
  rpc: GodwokenClient,
  address: string
): Promise<string | null> {
  const accountId = await ethContractAddressToAccountId(address, rpc);
  if (accountId == null) {
    const short_address = ethAddressToScriptHash(address).slice(0, 42);
    return short_address;
  }
  // TODO: another type ?
  return address;
}

function ethAddressToScriptHash(address: string) {
  const script: Script = {
    code_hash: envConfig.ethAccountLockHash as string,
    hash_type: "type",
    args: envConfig.rollupTypeHash + address.slice(2),
  };
  const scriptHash = utils.computeScriptHash(script);
  return scriptHash;
}

// https://github.com/nervosnetwork/godwoken-polyjuice/blob/7a04c9274c559e91b677ff3ea2198b58ba0003e7/polyjuice-tests/src/helper.rs#L239
async function ethContractAddressToAccountId(
  address: string,
  rpc: GodwokenClient
): Promise<number | undefined> {
  if (address.length != 42) {
    throw new Error(`Invalid eth address length: ${address.length}`);
  }
  if (address === "0x0000000000000000000000000000000000000000") {
    return +(process.env.CREATOR_ACCOUNT_ID as string);
  }
  // todo: support create2 contract address in which case it has not been created.
  try {
    const scriptHash: Hash | undefined = await rpc.getScriptHashByShortAddress(
      address
    );
    if (scriptHash == null) {
      return undefined;
    }
    const accountId = await rpc.getAccountIdByScriptHash(scriptHash);
    console.log(`eth contract address: ${address}, account id: ${accountId}`);
    return accountId == null ? undefined : +accountId;
  } catch (error) {
    return undefined;
  }
}

function polyjuiceBuildContractCodeKey(accountId: number) {
  return polyjuiceBuildSystemKey(accountId, POLYJUICE_CONTRACT_CODE);
}

function polyjuiceBuildSystemKey(accountId: number, fieldType: number) {
  let key = new Uint8Array(32);
  const array = uint32ToLeBytes(accountId) as number[];
  key[0] = array[0];
  key[1] = array[1];
  key[2] = array[2];
  key[3] = array[3];
  key[4] = POLYJUICE_SYSTEM_PREFIX;
  key[5] = fieldType;
  return "0x" + Buffer.from(key).toString("hex");
}

// function ethStoragePositionToRawKey(ethStoragePosition: string) {}

function uint32ToLeBytes(id: number) {
  let hex = id.toString(16);
  if (hex.length < 8) {
    hex = "0".repeat(8 - hex.length) + hex;
  }
  const array = hex
    .match(/../g)
    ?.reverse()
    .map((x) => {
      return parseInt("0x" + x);
    });
  return array;
}

function buildPolyjuiceArgs(
  toId: number,
  gas: bigint,
  gasPrice: bigint,
  value: bigint,
  data: string
) {
  const argsHeaderBuf = Buffer.from([
    0xff,
    0xff,
    0xff,
    "P".charCodeAt(0),
    "O".charCodeAt(0),
    "L".charCodeAt(0),
    "Y".charCodeAt(0),
  ]);
  const callKind = toId === +(process.env.CREATOR_ACCOUNT_ID as string) ? 3 : 0;
  const gasLimitBuf = Buffer.alloc(8);
  gasLimitBuf.writeBigUInt64LE(gas);
  const gasPriceBuf = Buffer.alloc(16);
  gasPriceBuf.writeBigUInt64LE(gasPrice & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
  gasPriceBuf.writeBigUInt64LE(gasPrice >> BigInt(64), 8);
  const valueBuf = Buffer.alloc(16);
  valueBuf.writeBigUInt64LE(value & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
  valueBuf.writeBigUInt64LE(value >> BigInt(64), 8);
  const dataSizeBuf = Buffer.alloc(4);
  const dataBuf = Buffer.from(data.slice(2), "hex");
  dataSizeBuf.writeUInt32LE(dataBuf.length);

  const argsLength = 8 + 8 + 16 + 16 + 4 + dataBuf.length;
  const argsBuf = Buffer.alloc(argsLength);
  argsHeaderBuf.copy(argsBuf, 0);
  argsBuf[7] = callKind;
  gasLimitBuf.copy(argsBuf, 8);
  gasPriceBuf.copy(argsBuf, 16);
  valueBuf.copy(argsBuf, 32);
  dataSizeBuf.copy(argsBuf, 48);
  dataBuf.copy(argsBuf, 52);
  const argsHex = "0x" + argsBuf.toString("hex");
  return argsHex;
}

function buildRawL2Transaction(
  fromId: number,
  toId: number,
  nonce: number,
  args: string
) {
  const rawL2Transaction = {
    from_id: "0x" + BigInt(fromId).toString(16),
    to_id: "0x" + BigInt(toId).toString(16),
    nonce: "0x" + BigInt(nonce).toString(16),
    args: args,
  };
  return rawL2Transaction;
}

function buildStorageKey(storagePosition: string) {
  let key = storagePosition.slice(2);
  if (key.length < 64) {
    key = "0".repeat(64 - key.length) + key;
  }
  console.log("storage position:", key);
  return "0x" + key;
}

async function allTypeEthAddressToAccountId(
  rpc: GodwokenClient,
  address: string
): Promise<number | undefined> {
  const scriptHash = ethAddressToScriptHash(address);
  let accountId = await rpc.getAccountIdByScriptHash(scriptHash);
  if (accountId === null || accountId === undefined) {
    accountId = await ethContractAddressToAccountId(address, rpc);
  }
  return accountId;
}

async function buildEthCallTx(
  txCallObj: TransactionCallObject,
  rpc: GodwokenClient
): Promise<RawL2Transaction> {
  const fromAddress = txCallObj.from || envConfig.defaultFromAddress;
  const toAddress = txCallObj.to || "0x" + "00".repeat(20);
  const gas = txCallObj.gas || "0x1000000";
  const gasPrice = txCallObj.gasPrice || "0x1";
  const value = txCallObj.value || "0x0";
  const data = txCallObj.data || "0x0";
  let fromId: number | undefined;
  if (
    fromAddress != null &&
    fromAddress != undefined &&
    typeof fromAddress === "string"
  ) {
    const fromScriptHash = ethAddressToScriptHash(fromAddress);
    fromId = await rpc.getAccountIdByScriptHash(fromScriptHash);
    console.log(`fromId: ${fromId}`);
  }

  if (fromId == null) {
    throw new Error("from id not found!");
  }

  const toId = await ethContractAddressToAccountId(toAddress, rpc);
  if (toId == null) {
    throw new Error("to id missing!");
  }
  const nonce = 0;
  const polyjuiceArgs = buildPolyjuiceArgs(
    toId,
    BigInt(gas),
    BigInt(gasPrice),
    BigInt(value),
    data
  );
  const rawL2Transaction = buildRawL2Transaction(
    fromId,
    toId,
    nonce,
    polyjuiceArgs
  );
  console.log(`rawL2Transaction: ${JSON.stringify(rawL2Transaction, null, 2)}`);
  return rawL2Transaction;
}

function extractPolyjuiceSystemLog(logItems: LogItem[]): GodwokenLog {
  for (const logItem of logItems) {
    if (logItem.service_flag === "0x2") {
      return parseLog(logItem);
    }
  }
  throw new Error(
    `Can't found PolyjuiceSystemLog, logItems: ${JSON.stringify(logItems)}`
  );
}

// https://github.com/nervosnetwork/godwoken-polyjuice/blob/v0.6.0-rc1/polyjuice-tests/src/helper.rs#L122
function parseLog(logItem: LogItem): GodwokenLog {
  switch (logItem.service_flag) {
    case SUDT_OPERATION_LOG_FLGA:
      return parseSudtOperationLog(logItem);
    case SUDT_PAY_FEE_LOG_FLAG:
      return parseSudtPayFeeLog(logItem);
    case POLYJUICE_SYSTEM_LOG_FLAG:
      return parsePolyjuiceSystemLog(logItem);
    case POLYJUICE_USER_LOG_FLAG:
      return parsePolyjuiceUserLog(logItem);
    default:
      throw new Error(`Can't parse logItem: ${logItem}`);
  }
}
function parseSudtOperationLog(logItem: LogItem): SudtOperationLog {
  let buf = Buffer.from(logItem.data.slice(2), "hex");
  if (buf.length !== 4 + 4 + 16) {
    throw new Error(
      `invalid sudt operation log raw data length: ${buf.length}`
    );
  }
  const fromId = buf.readUInt32LE(0);
  const toId = buf.readUInt32LE(4);
  const amount = buf.readBigUInt64LE(8);
  return {
    sudtId: +logItem.account_id,
    fromId: fromId,
    toId: toId,
    amount: amount,
  };
}

function parseSudtPayFeeLog(logItem: LogItem): SudtPayFeeLog {
  let buf = Buffer.from(logItem.data.slice(2), "hex");
  if (buf.length != 4 + 4 + 16) {
    throw new Error(
      `invalid sudt operation log raw data length: ${buf.length}`
    );
  }
  const fromId = buf.readUInt32LE(0);
  const blockProducerId = buf.readUInt32LE(4);
  const amount = buf.readBigUInt64LE(8);
  return {
    sudtId: +logItem.account_id,
    fromId: fromId,
    blockProducerId: blockProducerId,
    amount: amount,
  };
}

function parsePolyjuiceSystemLog(logItem: LogItem): PolyjuiceSystemLog {
  let buf = Buffer.from(logItem.data.slice(2), "hex");
  if (buf.length != 8 + 8 + 16 + 4 + 4) {
    throw new Error(`invalid system log raw data length: ${buf.length}`);
  }
  const gasUsed = buf.readBigUInt64LE(0);
  const cumulativeGasUsed = buf.readBigUInt64LE(8);
  const createdAddress = "0x" + buf.slice(16, 32).toString("hex");
  const statusCode = buf.readUInt32LE(32);
  return {
    gasUsed: gasUsed,
    cumulativeGasUsed: cumulativeGasUsed,
    createdAddress: createdAddress,
    statusCode: statusCode,
  };
}

function parsePolyjuiceUserLog(logItem: LogItem): PolyjuiceUserLog {
  const buf = Buffer.from(logItem.data.slice(2), "hex");
  let offset = 0;
  const address = buf.slice(offset, offset + 20);
  offset += 20;
  const dataSize = buf.readUInt32LE(offset);
  offset += 4;
  const logData = buf.slice(offset, offset + dataSize);
  offset += dataSize;
  const topics_count = buf.readUInt32LE(offset);
  offset += 4;
  let topics = [];
  for (let i = 0; i < topics_count; i++) {
    const topic = buf.slice(offset, offset + 32);
    offset += 32;
    topics.push("0x" + topic.toString("hex"));
  }

  if (offset != buf.length) {
    throw new Error(
      `Too many bytes for polyjuice user log data: offset=${offset}, data.len()=${buf.length}`
    );
  }

  return {
    address: "0x" + address.toString("hex"),
    data: "0x" + logData.toString("hex"),
    topics: topics,
  };
}
