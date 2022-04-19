import {
  GodwokenLog,
  LogItem,
  SudtOperationLog,
  PolyjuiceSystemLog,
  PolyjuiceUserLog,
  TransactionCallObject,
  SudtPayFeeLog,
  BlockParameter,
} from "../types";
import { middleware, validators, verifyGasLimit } from "../validator";
import { FilterFlag, FilterObject } from "../../cache/types";
import { HexNumber, Hash, Address, HexString } from "@ckb-lumos/base";
import { RawL2Transaction, RunResult } from "@godwoken-web3/godwoken";
import {
  CKB_SUDT_ID,
  POLYJUICE_CONTRACT_CODE,
  POLYJUICE_SYSTEM_PREFIX,
  SUDT_OPERATION_LOG_FLAG,
  SUDT_PAY_FEE_LOG_FLAG,
  POLYJUICE_SYSTEM_LOG_FLAG,
  POLYJUICE_USER_LOG_FLAG,
  QUERY_OFFSET_REACHED_END,
  POLY_MAX_BLOCK_GAS_LIMIT,
  POLY_MIN_GAS_PRICE,
} from "../constant";
import {
  ExecuteOneQueryResult,
  limitQuery,
  Query,
  QueryRoundStatus,
} from "../../db";
import { envConfig } from "../../base/env-config";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { Uint128, Uint32, Uint64 } from "../../base/types/uint";
import {
  errorReceiptToApiTransaction,
  errorReceiptToApiTransactionReceipt,
  Log,
  LogQueryOption,
  toApiBlock,
  toApiLog,
  toApiTransaction,
  toApiTransactionReceipt,
} from "../../db/types";
import {
  HeaderNotFoundError,
  InvalidParamsError,
  MethodNotSupportError,
  Web3Error,
} from "../error";
import {
  EthBlock,
  EthLog,
  EthTransaction,
  EthTransactionReceipt,
  FailedReason,
} from "../../base/types/api";
import { filterWeb3Transaction } from "../../filter-web3-tx";
import { FilterManager } from "../../cache";
import { failedReasonByErrorReceipt, parseGwRunResultError } from "../gw-error";
import { Store } from "../../cache/store";
import {
  CACHE_EXPIRED_TIME_MILSECS,
  TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS,
  TX_HASH_MAPPING_PREFIX_KEY,
} from "../../cache/constant";
import { isErc20Transfer } from "../../erc20";
import { calcEthTxHash, generateRawTransaction } from "../../convert-tx";
import { ethAddressToAccountId, EthRegistryAddress } from "../../base/address";
import { keccakFromString } from "ethereumjs-util";
import { DataCacheConstructor, RedisDataCache } from "../../cache/data";
import { logger } from "../../base/logger";

const Config = require("../../../config/eth.json");

type U32 = number;
type U64 = bigint;

const ZERO_ETH_ADDRESS = "0x" + "00".repeat(20);
const ZERO_TX_HASH = "0x" + "00".repeat(32);

type GodwokenBlockParameter = U64 | undefined;

export class Eth {
  private query: Query;
  private rpc: GodwokenClient;
  private ethWallet: boolean;
  private filterManager: FilterManager;
  private cacheStore: Store;
  private gasPriceCacheMilSec: number;

  constructor(ethWallet: boolean = false) {
    this.ethWallet = ethWallet;
    this.query = new Query();
    this.rpc = new GodwokenClient(
      envConfig.godwokenJsonRpc,
      envConfig.godwokenReadonlyJsonRpc
    );
    this.filterManager = new FilterManager(true);
    this.filterManager.connect();

    this.cacheStore = new Store(
      envConfig.redisUrl,
      true,
      CACHE_EXPIRED_TIME_MILSECS
    );
    this.cacheStore.init();

    const cacheSeconds: number = +(envConfig.gasPriceCacheSeconds || "0");
    this.gasPriceCacheMilSec = cacheSeconds * 1000;

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
      validators.storageKey,
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
      validators.ethEstimateGasParams,
    ]);
    this.newFilter = middleware(this.newFilter.bind(this), 1, [
      validators.newFilterParams,
    ]);
    this.uninstallFilter = middleware(this.uninstallFilter.bind(this), 1, [
      validators.hexString,
    ]);
    this.getFilterLogs = middleware(this.getFilterLogs.bind(this), 1, [
      validators.hexString,
    ]);
    this.getFilterChanges = middleware(this.getFilterChanges.bind(this), 1, [
      validators.hexString,
    ]);
    this.getLogs = middleware(this.getLogs.bind(this), 1, [
      validators.newFilterParams,
    ]);

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

  chainId(args: []): HexNumber {
    return "0x" + BigInt(envConfig.chainId).toString(16);
  }

  /**
   * Returns the current protocol version
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * protocol version as the second argument
   */
  protocolVersion(args: []): HexNumber {
    const version = "0x" + BigInt(Config.eth_protocolVersion).toString(16);
    return version;
  }

  /**
   * Returns block syncing info
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * SyncingStatus as the second argument.
   *    SyncingStatus: false or { startingBlock, currentBlock, highestBlock }
   */
  async syncing(args: []): Promise<any> {
    // TODO get the latest L2 block number
    const tipNumber = await this.query.getTipBlockNumber();
    if (tipNumber == null) {
      return false;
    }
    const blockHeight: HexNumber = new Uint64(tipNumber).toHex();
    const result = {
      startingBlock: blockHeight,
      currentBlock: blockHeight,
      highestBlock: blockHeight,
    };
    return result;
  }

  /**
   * Returns client coinbase address, which is always zero hashes
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 20 bytes 0 hex string as the second argument.
   */
  coinbase(args: []): Address {
    return ZERO_ETH_ADDRESS;
  }

  /**
   * Returns if client is mining, which is always false
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * false as the second argument.
   */
  mining(args: []): boolean {
    return false;
  }

  /**
   * Returns client mining hashrate, which is always 0x0
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 0x0 as the second argument.
   */
  hashrate(args: []): HexNumber {
    return "0x0";
  }

  /**
   * Return median gas_price of latest 500 transactions
   *
   * @param _args empty
   * @returns
   */
  async gasPrice(_args: []): Promise<HexNumber> {
    const key = `eth.eth_gasPrice`;
    if (this.gasPriceCacheMilSec > 0) {
      const cachedGasPrice = await this.cacheStore.get(key);
      if (cachedGasPrice != null) {
        return cachedGasPrice;
      }
    }

    let medianGasPrice = await this.query.getMedianGasPrice();
    // set min to 1
    const minGasPrice = BigInt(1);
    if (medianGasPrice < minGasPrice) {
      medianGasPrice = minGasPrice;
    }
    const medianGasPriceHex = "0x" + medianGasPrice.toString(16);

    if (this.gasPriceCacheMilSec > 0) {
      this.cacheStore.insert(key, medianGasPriceHex, this.gasPriceCacheMilSec);
    }

    return medianGasPriceHex;
  }

  /**
   * Returns client saved wallet addresses, which is always zero array
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * [] as the second argument.
   */
  accounts(args: []): [] {
    return [];
  }

  async blockNumber(args: []): Promise<HexNumber | null> {
    const tipBlockNumber = await this.query.getTipBlockNumber();
    if (tipBlockNumber == null) {
      return null;
    }
    const blockHeight: HexNumber = new Uint64(tipBlockNumber).toHex();
    return blockHeight;
  }

  async sign(_args: any[]): Promise<void> {
    throw new MethodNotSupportError("eth_sign is not supported!");
  }

  async signTransaction(_args: any[]): Promise<void> {
    throw new MethodNotSupportError("eth_signTransaction is not supported!");
  }

  async sendTransaction(_args: any[]): Promise<void> {
    throw new MethodNotSupportError("eth_sendTransaction is not supported!");
  }

  async getBalance(args: [string, string]): Promise<HexNumber> {
    try {
      const address = args[0];
      const blockParameter = args[1];
      const blockNumber: GodwokenBlockParameter =
        await this.parseBlockParameter(blockParameter);
      const registryAddress: EthRegistryAddress = new EthRegistryAddress(
        address
      );
      const balance = await this.rpc.getBalance(
        registryAddress.serialize(),
        +CKB_SUDT_ID,
        blockNumber
      );

      if (this.ethWallet) {
        const balanceHex = new Uint128(balance * 10n ** 10n).toHex();
        return balanceHex;
      }

      const balanceHex = new Uint128(balance).toHex();
      return balanceHex;
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }

  async getStorageAt(args: [string, string, string]): Promise<HexString> {
    try {
      const address = args[0];
      const storagePosition = args[1];
      const blockParameter = args[2];
      const blockNumber: GodwokenBlockParameter =
        await this.parseBlockParameter(blockParameter);
      const accountId: U32 | undefined = await ethAddressToAccountId(
        address,
        this.rpc
      );
      if (accountId == null) {
        return "0x0000000000000000000000000000000000000000000000000000000000000000";
      }

      const key = buildStorageKey(storagePosition);
      const value = await this.rpc.getStorageAt(accountId, key, blockNumber);
      return value;
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }

  /**
   *
   * @param args [address, QUANTITY|TAG]
   * @param callback
   */
  async getTransactionCount(args: [string, string]): Promise<HexNumber> {
    try {
      const address = args[0];
      const blockParameter = args[1];
      const blockNumber: GodwokenBlockParameter =
        await this.parseBlockParameter(blockParameter);
      const accountId: number | undefined = await ethAddressToAccountId(
        address,
        this.rpc
      );
      if (accountId == null) {
        return "0x0";
      }
      const nonce = await this.rpc.getNonce(accountId, blockNumber);
      const transactionCount = new Uint32(nonce).toHex();
      return transactionCount;
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }

  async getCode(args: [string, string]): Promise<HexString> {
    try {
      const defaultResult = "0x";

      const address = args[0];
      const blockParameter = args[1];
      const blockNumber: GodwokenBlockParameter =
        await this.parseBlockParameter(blockParameter);
      const accountId: number | undefined = await ethAddressToAccountId(
        address,
        this.rpc
      );
      if (accountId == null) {
        return defaultResult;
      }
      const contractCodeKey = polyjuiceBuildContractCodeKey(accountId);
      const dataHash = await this.rpc.getStorageAt(
        accountId,
        contractCodeKey,
        blockNumber
      );
      const data = await this.rpc.getData(dataHash, blockNumber);
      return data || defaultResult;
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }

  async call(args: [TransactionCallObject, string]): Promise<HexString> {
    try {
      const txCallObj = args[0];
      const blockParameter = args[1];
      const blockNumber: GodwokenBlockParameter =
        await this.parseBlockParameter(blockParameter);

      const executeCallResult = async () => {
        let runResult: RunResult | undefined;
        try {
          runResult = await ethCallTx(txCallObj, this.rpc, blockNumber);
        } catch (err) {
          throw parseGwRunResultError(err);
        }

        logger.debug("RunResult:", runResult);
        return runResult.return_data;
      };

      // using cache
      if (envConfig.enableCacheEthCall === "true") {
        // calculate raw data cache key
        const [tipBlockHash, memPollStateRoot] = await Promise.all([
          this.rpc.getTipBlockHash(),
          this.rpc.getMemPoolStateRoot(),
        ]);
        const serializeParams = serializeEthCallParameters(
          txCallObj,
          blockNumber
        );
        const rawDataKey = getEthCallCacheKey(
          serializeParams,
          tipBlockHash,
          memPollStateRoot
        );

        const prefixName = `${this.constructor.name}:call`; // FIXME: ${this.call.name} is null
        const constructArgs: DataCacheConstructor = {
          prefixName,
          rawDataKey,
          executeCallResult,
        };
        const dataCache = new RedisDataCache(constructArgs);
        const return_data = await dataCache.get();
        return return_data;
      } else {
        // not using cache
        const return_data = await executeCallResult();
        return return_data;
      }
    } catch (error: any) {
      throw new Web3Error(error.message, error.data);
    }
  }

  async estimateGas(
    args: [Partial<TransactionCallObject>]
  ): Promise<HexNumber> {
    try {
      const txCallObj = args[0];

      if (txCallObj.to == null) {
        txCallObj.to = "0x";
      }

      const extraGas: bigint = BigInt(envConfig.extraEstimateGas || "0");

      // cache erc20 transfer result
      const cacheKey = `eth.eth_estimateGas.erc20_transfer`;
      let isTransfer = false;
      if (txCallObj.data != null && txCallObj.data !== "0x") {
        isTransfer = isErc20Transfer(txCallObj.data);
        if (isTransfer) {
          const cachedResult = await this.cacheStore.get(cacheKey);
          if (cachedResult != null) {
            return cachedResult;
          }
        }
      }

      let runResult: RunResult | undefined;
      try {
        runResult = await ethCallTx(
          txCallObj as TransactionCallObject,
          this.rpc,
          undefined
        );
      } catch (error) {
        throw parseGwRunResultError(error);
      }

      const polyjuiceSystemLog = extractPolyjuiceSystemLog(
        runResult.logs
      ) as PolyjuiceSystemLog;

      logger.debug(
        "eth_estimateGas RunResult:",
        runResult,
        "0x" + BigInt(polyjuiceSystemLog.gasUsed).toString(16)
      );

      const gasUsed: bigint = polyjuiceSystemLog.gasUsed + extraGas;
      const result = "0x" + gasUsed.toString(16);

      if (isTransfer) {
        // no await
        this.cacheStore.insert(cacheKey, result);
      }

      return result;
    } catch (error: any) {
      throw new Web3Error("UNPREDICTABLE_GAS_LIMIT: " + error.message);
    }
  }

  async getBlockByHash(args: [string, boolean]): Promise<EthBlock | null> {
    try {
      const blockHash = args[0];
      const isFullTransaction = args[1];

      const block = await this.query.getBlockByHash(blockHash);
      if (block == null) {
        return null;
      }

      if (isFullTransaction) {
        const txs = await this.query.getTransactionsByBlockHash(blockHash);
        const apiTxs = txs.map((tx) => toApiTransaction(tx));
        const apiBlock = toApiBlock(block, apiTxs);
        return apiBlock;
      } else {
        const ethTxHashes: Hash[] =
          await this.query.getTransactionEthHashesByBlockHash(blockHash);
        const apiBlock = toApiBlock(block, ethTxHashes);
        return apiBlock;
      }
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }

  async getBlockByNumber(args: [string, boolean]): Promise<EthBlock | null> {
    const blockParameter = args[0];
    const isFullTransaction = args[1];
    let blockNumber: U64 | undefined;

    try {
      blockNumber = await this.blockParameterToBlockNumber(blockParameter);
    } catch (error: any) {
      return null;
    }

    const block = await this.query.getBlockByNumber(blockNumber);
    if (block == null) {
      return null;
    }

    const apiBlock = toApiBlock(block);
    if (isFullTransaction) {
      const txs = await this.query.getTransactionsByBlockNumber(blockNumber);
      const apiTxs = txs.map((tx) => toApiTransaction(tx));
      apiBlock.transactions = apiTxs;
    } else {
      const txHashes: Hash[] =
        await this.query.getTransactionEthHashesByBlockNumber(blockNumber);

      apiBlock.transactions = txHashes;
    }
    return apiBlock;
  }

  /**
   *
   * @param args [blockHash]
   * @param callback
   */
  async getBlockTransactionCountByHash(args: [string]): Promise<HexNumber> {
    const blockHash: Hash = args[0];

    const txCount = await this.query.getBlockTransactionCountByHash(blockHash);
    const txCountHex = new Uint32(txCount).toHex();

    return txCountHex;
  }

  /**
   *
   * @param args [blockNumber]
   * @param callback
   */
  async getBlockTransactionCountByNumber(args: [string]): Promise<HexNumber> {
    const blockParameter = args[0];
    const blockNumber: U64 | undefined = await this.blockParameterToBlockNumber(
      blockParameter
    );

    const txCount = await this.query.getBlockTransactionCountByNumber(
      blockNumber
    );
    const txCountHex: HexNumber = new Uint32(txCount).toHex();
    return txCountHex;
  }

  async getUncleByBlockHashAndIndex(args: [string, string]): Promise<null> {
    return null;
  }

  async getUncleByBlockNumberAndIndex(args: [string, string]): Promise<null> {
    return null;
  }

  /**
   *
   * @param args [blockHash]
   * @param callback
   */
  async getUncleCountByBlockHash(args: [string]): Promise<HexNumber> {
    return "0x0";
  }

  /**
   *
   * @param args [blockNumber]
   * @param callback
   */
  async getUncleCountByBlockNumber(args: [string]): Promise<HexNumber> {
    return "0x0";
  }

  /**
   *
   * @param args
   * @returns always empty array
   */
  async getCompilers(args: []): Promise<[]> {
    return [];
  }

  async getTransactionByHash(args: [string]): Promise<EthTransaction | null> {
    const ethTxHash: Hash = args[0];
    const gwTxHash: Hash | null = await this.ethTxHashToGwTxHash(ethTxHash);
    if (gwTxHash == null) {
      return null;
    }

    const tx = await this.query.getTransactionByHash(gwTxHash);
    if (tx != null) {
      const apiTx = toApiTransaction(tx);
      return apiTx;
    }

    // find error receipt
    const errorReceipt = await this.query.getErrorTransactionReceipt(gwTxHash);
    if (errorReceipt != null) {
      const blockNumber = errorReceipt.block_number;
      const downBlockNumber = blockNumber - 1n;
      const downBlock = await this.query.getBlockByNumber(downBlockNumber);
      let blockHash = "0x" + "00".repeat(32);
      if (downBlock != null) {
        const downBlockHash = downBlock.hash;
        blockHash =
          "0x" + (BigInt(downBlockHash) + 1n).toString(16).padStart(64, "0");
      }
      return errorReceiptToApiTransaction(errorReceipt, blockHash, ethTxHash);
    }

    // if null, find pending transactions
    const godwokenTxWithStatus = await this.rpc.getTransaction(gwTxHash);
    if (godwokenTxWithStatus == null) {
      return null;
    }
    const godwokenTxReceipt = await this.rpc.getTransactionReceipt(gwTxHash);
    const tipBlock = await this.query.getTipBlock();
    if (tipBlock == null) {
      throw new Error("tip block not found!");
    }
    let ethTxInfo = undefined;
    try {
      ethTxInfo = await filterWeb3Transaction(
        ethTxHash,
        this.rpc,
        tipBlock.number,
        tipBlock.hash,
        godwokenTxWithStatus.transaction,
        godwokenTxReceipt
      );
    } catch (err) {
      logger.error("filterWeb3Transaction:", err);
      logger.info("godwoken tx:", godwokenTxWithStatus);
      logger.info("godwoken receipt:", godwokenTxReceipt);
      throw err;
    }
    if (ethTxInfo != null) {
      const ethTx = ethTxInfo[0];
      return ethTx;
    }

    return null;
  }

  /**
   *
   * @param args [blockHash, index]
   * @param callback
   */
  async getTransactionByBlockHashAndIndex(
    args: [string, string]
  ): Promise<EthTransaction | null> {
    const blockHash: Hash = args[0];
    const index = +args[1];

    const tx = await this.query.getTransactionByBlockHashAndIndex(
      blockHash,
      index
    );
    if (tx == null) {
      return null;
    }
    const apiTx = toApiTransaction(tx);
    return apiTx;
  }

  async getTransactionByBlockNumberAndIndex(
    args: [string, string]
  ): Promise<EthTransaction | null> {
    const blockParameter = args[0];
    const index: U32 = +args[1];
    const blockNumber: U64 = await this.blockParameterToBlockNumber(
      blockParameter
    );

    const tx = await this.query.getTransactionByBlockNumberAndIndex(
      blockNumber,
      index
    );

    if (tx == null) {
      return null;
    }

    const apiTx = toApiTransaction(tx);
    return apiTx;
  }

  async getTransactionReceipt(
    args: [string]
  ): Promise<EthTransactionReceipt | null> {
    const ethTxHash: Hash = args[0];
    const gwTxHash: Hash | null = await this.ethTxHashToGwTxHash(ethTxHash);
    if (gwTxHash == null) {
      return null;
    }

    const data = await this.query.getTransactionAndLogsByHash(gwTxHash);
    if (data != null) {
      const [tx, logs] = data;
      const apiLogs = logs.map((log) => toApiLog(log, ethTxHash));
      const transactionReceipt = toApiTransactionReceipt(tx, apiLogs);
      return transactionReceipt;
    }

    const errorReceipt = await this.query.getErrorTransactionReceipt(gwTxHash);
    if (errorReceipt != null) {
      const blockNumber = errorReceipt.block_number;
      const downBlockNumber = blockNumber - 1n;
      const downBlock = await this.query.getBlockByNumber(downBlockNumber);
      let blockHash = "0x" + "00".repeat(32);
      if (downBlock != null) {
        const downBlockHash = downBlock.hash;
        blockHash =
          "0x" + (BigInt(downBlockHash) + 1n).toString(16).padStart(64, "0");
      }
      const receipt = errorReceiptToApiTransactionReceipt(
        errorReceipt,
        blockHash,
        ethTxHash
      );
      const failedReason: FailedReason =
        failedReasonByErrorReceipt(errorReceipt);
      receipt.failed_reason = failedReason;
      return receipt;
    }

    const godwokenTxWithStatus = await this.rpc.getTransaction(gwTxHash);
    if (godwokenTxWithStatus == null) {
      return null;
    }
    const godwokenTxReceipt = await this.rpc.getTransactionReceipt(gwTxHash);
    if (godwokenTxReceipt == null) {
      return null;
    }
    const tipBlock = await this.query.getTipBlock();
    if (tipBlock == null) {
      throw new Error(`tip block not found`);
    }
    let ethTxInfo = undefined;
    try {
      ethTxInfo = await filterWeb3Transaction(
        ethTxHash,
        this.rpc,
        tipBlock.number,
        tipBlock.hash,
        godwokenTxWithStatus.transaction,
        godwokenTxReceipt
      );
    } catch (err) {
      logger.error("filterWeb3Transaction:", err);
      logger.info("godwoken tx:", godwokenTxWithStatus);
      logger.info("godwoken receipt:", godwokenTxReceipt);
      throw err;
    }
    if (ethTxInfo != null) {
      const ethTxReceipt = ethTxInfo[1]!;
      return ethTxReceipt;
    }

    return null;
  }

  /* #region filter-related api methods */
  async newFilter(args: [FilterObject]): Promise<HexString> {
    const tipLog: Log | null = await this.query.getTipLog();
    let initialLogId: bigint = tipLog == null ? 0n : tipLog.id;
    const filter_id = await this.filterManager.install(args[0], initialLogId);
    return filter_id;
  }

  async newBlockFilter(args: []): Promise<HexString> {
    const tipBlockNum = await this.getTipNumber();
    const filter_id = await this.filterManager.install(
      FilterFlag.blockFilter,
      tipBlockNum
    );
    return filter_id;
  }

  async newPendingTransactionFilter(args: []): Promise<HexString> {
    const tipBlockNum = await this.getTipNumber();
    const filter_id = await this.filterManager.install(
      FilterFlag.pendingTransaction,
      tipBlockNum
    );
    return filter_id;
  }

  async uninstallFilter(args: [HexString]): Promise<boolean> {
    const filter_id = args[0];
    const isUninstalled = await this.filterManager.uninstall(filter_id);
    return isUninstalled;
  }

  async getFilterLogs(args: [string]): Promise<Array<any>> {
    const filter_id = args[0];
    const filter = await this.filterManager.get(filter_id);

    if (!filter) {
      throw new Web3Error(
        `invalid filter id ${filter_id}. the filter might be removed or outdated.`
      );
    }

    if (filter === FilterFlag.blockFilter) {
      // block filter
      // return all blocks
      const blocks = await this.query.getBlocksAfterBlockNumber(
        BigInt(0),
        "desc"
      );
      const block_hashes = blocks.map((block) => block.hash);
      return block_hashes;
    }

    if (filter === FilterFlag.pendingTransaction) {
      // pending tx filter, not supported.
      return [];
    }

    return await this.getLogs([filter!]);
  }

  async getFilterChanges(args: [string]): Promise<string[] | EthLog[]> {
    const filter_id = args[0];
    const filter = await this.filterManager.get(filter_id);

    if (!filter) {
      throw new Web3Error(
        `invalid filter id ${filter_id}. the filter might be removed or outdated.`
      );
    }

    //***** handle block-filter
    if (filter === FilterFlag.blockFilter) {
      const last_poll_block_number = await this.filterManager.getLastPoll(
        filter_id
      );
      // get all block occurred since last poll
      // ( block_number > last_poll_cache_block_number )
      const blocks = await this.query.getBlocksAfterBlockNumber(
        BigInt(last_poll_block_number),
        "desc"
      );

      if (blocks.length === 0) return [];

      // remember to update the last poll cache
      // blocks[0] is now the highest block number(meaning it is the newest cache block number)
      await this.filterManager.updateLastPoll(filter_id, blocks[0].number);
      const block_hashes = blocks.map((block) => block.hash);
      return block_hashes;
    }

    //***** handle pending-tx-filter, currently not supported.
    if (filter === FilterFlag.pendingTransaction) {
      return [];
    }

    //***** handle normal-filter
    const lastPollLogId = await this.filterManager.getLastPoll(filter_id);
    const blockHash = filter.blockHash;
    const address = filter.address;
    const topics = filter.topics;
    const queryOption: LogQueryOption = {
      address,
      topics,
    };

    const execOneQuery = async (offset: number) => {
      // if blockHash exits, fromBlock and toBlock is not allowed.
      if (blockHash) {
        const logs = await this.query.getLogsAfterLastPoll(
          lastPollLogId,
          queryOption,
          blockHash,
          undefined,
          offset
        );
        if (logs.length === 0) return [];

        return logs;
      }

      const fromBlockNumber: U64 = await this.blockParameterToBlockNumber(
        filter.fromBlock || "latest"
      );
      const toBlockNumber: U64 = await this.blockParameterToBlockNumber(
        filter.toBlock || "latest"
      );
      const logs = await this.query.getLogsAfterLastPoll(
        lastPollLogId!,
        queryOption,
        fromBlockNumber,
        toBlockNumber,
        offset
      );
      if (logs.length === 0) return [];

      return logs;
    };

    const executeOneQuery = async (offset: number) => {
      try {
        const data = await execOneQuery(offset);

        return {
          status: QueryRoundStatus.keepGoing,
          data: data,
        } as ExecuteOneQueryResult;
      } catch (error) {
        if (
          (error as unknown as Error).message.includes(QUERY_OFFSET_REACHED_END)
        ) {
          return {
            status: QueryRoundStatus.stop,
            data: [], // return empty result
          } as ExecuteOneQueryResult;
        }
        throw error;
      }
    };

    const logs: Log[] = await limitQuery(executeOneQuery.bind(this));
    // remember to update the last poll cache
    // logsData[0] is now the highest log id(meaning it is the newest cache log id)
    if (logs.length !== 0) {
      await this.filterManager.updateLastPoll(filter_id, logs[0].id);
    }

    return await Promise.all(
      logs.map(async (log) => {
        const ethTxHash =
          (await this.gwTxHashToEthTxHash(log.transaction_hash)) ||
          ZERO_TX_HASH;
        return toApiLog(log, ethTxHash);
      })
    );
  }

  async getLogs(args: [FilterObject]): Promise<EthLog[]> {
    const filter = args[0];

    const topics = filter.topics || [];
    const address = filter.address;
    const blockHash = filter.blockHash;

    const queryOption: LogQueryOption = {
      topics,
      address,
    };

    const execOneQuery = async (offset: number) => {
      // if blockHash exits, fromBlock and toBlock is not allowed.
      if (blockHash) {
        const logs = await this.query.getLogs(
          queryOption,
          blockHash,
          undefined,
          offset
        );
        return await Promise.all(
          logs.map(async (log) => {
            const ethTxHash =
              (await this.gwTxHashToEthTxHash(log.transaction_hash)) ||
              ZERO_TX_HASH;
            return toApiLog(log, ethTxHash);
          })
        );
      }

      const fromBlockNumber: U64 = await this.blockParameterToBlockNumber(
        filter.fromBlock || "latest"
      );
      const toBlockNumber: U64 = await this.blockParameterToBlockNumber(
        filter.toBlock || "latest"
      );
      const logs = await this.query.getLogs(
        queryOption,
        fromBlockNumber,
        toBlockNumber,
        offset
      );
      return await Promise.all(
        logs.map(async (log) => {
          const ethTxHash =
            (await this.gwTxHashToEthTxHash(log.transaction_hash)) ||
            ZERO_TX_HASH;
          return toApiLog(log, ethTxHash);
        })
      );
    };

    const executeOneQuery = async (offset: number) => {
      try {
        const data = await execOneQuery(offset);
        return {
          status: QueryRoundStatus.keepGoing,
          data: data,
        } as ExecuteOneQueryResult;
      } catch (error: any) {
        if (
          (error as unknown as Error).message.includes(QUERY_OFFSET_REACHED_END)
        ) {
          return {
            status: QueryRoundStatus.stop,
            data: [], // return empty result
          } as ExecuteOneQueryResult;
        }
        throw new Web3Error(error.message, error.data);
      }
    };

    return await limitQuery(executeOneQuery.bind(this));
  }
  /* #endregion */

  // return gw tx hash
  async sendRawTransaction(args: [string]): Promise<Hash> {
    try {
      const data = args[0];
      const rawTx = await generateRawTransaction(data, this.rpc);
      const gwTxHash = await this.rpc.submitL2Transaction(rawTx);
      logger.info("eth_sendRawTransaction gw hash:", gwTxHash);
      const ethTxHash = calcEthTxHash(data);
      logger.info("eth_sendRawTransaction eth hash:", ethTxHash);

      // save the tx hash mapping for instant finality
      const ethTxHashKey = ethTxHashCacheKey(ethTxHash);
      await this.cacheStore.insert(
        ethTxHashKey,
        gwTxHash,
        TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS
      );
      const gwTxHashKey = gwTxHashCacheKey(gwTxHash);
      await this.cacheStore.insert(
        gwTxHashKey,
        ethTxHash,
        TX_HASH_MAPPING_CACHE_EXPIRED_TIME_MILSECS
      );

      return ethTxHash;
    } catch (error: any) {
      logger.error(error);
      throw new InvalidParamsError(error.message);
    }
  }

  private async getTipNumber(): Promise<U64> {
    const num = await this.query.getTipBlockNumber();
    if (num == null) {
      throw new Error("tip block number not found!!");
    }
    return num;
  }

  private async parseBlockParameter(
    blockParameter: BlockParameter
  ): Promise<GodwokenBlockParameter> {
    switch (blockParameter) {
      case "latest":
        return undefined;
      case "earliest":
        return 0n;
      // It's supposed to be filtered in the validator, so throw an error if matched
      case "pending":
        // null means pending in godwoken
        return undefined;
    }

    const tipNumber: bigint = await this.getTipNumber();
    const blockNumber: U64 = Uint64.fromHex(blockParameter).getValue();
    if (tipNumber < blockNumber) {
      throw new HeaderNotFoundError();
    }
    return blockNumber;
  }

  private async blockParameterToBlockNumber(
    blockParameter: BlockParameter
  ): Promise<U64> {
    const blockNumber: GodwokenBlockParameter = await this.parseBlockParameter(
      blockParameter
    );
    if (blockNumber === undefined) {
      return await this.getTipNumber();
    }
    return blockNumber;
  }

  private async ethTxHashToGwTxHash(ethTxHash: HexString) {
    // query from redis for instant-finality tx
    const ethTxHashKey = ethTxHashCacheKey(ethTxHash);
    let gwTxHash = await this.cacheStore.get(ethTxHashKey);
    if (gwTxHash != null) {
      return gwTxHash;
    }

    // query from database
    const transaction = await this.query.getTransactionByEthTxHash(ethTxHash);
    if (transaction != null) {
      return transaction.hash;
    }

    return null;
  }

  private async gwTxHashToEthTxHash(gwTxHash: HexString) {
    // query from redis for instant-finality tx
    const gwTxHashKey = gwTxHashCacheKey(gwTxHash);
    let ethTxHash = await this.cacheStore.get(gwTxHashKey);
    if (ethTxHash != null) {
      return ethTxHash;
    }

    // query from database
    const transaction = await this.query.getTransactionByHash(gwTxHash);
    if (transaction != null) {
      return transaction.eth_tx_hash;
    }

    return null;
  }
}

function ethTxHashCacheKey(ethTxHash: string) {
  return `${TX_HASH_MAPPING_PREFIX_KEY}:eth:${ethTxHash}`;
}

function gwTxHashCacheKey(gwTxHash: string) {
  return `${TX_HASH_MAPPING_PREFIX_KEY}:gw:${gwTxHash}`;
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
  chainId: bigint,
  fromId: number,
  toId: number,
  nonce: number,
  args: string
) {
  const rawL2Transaction = {
    chain_id: "0x" + chainId.toString(16),
    from_id: "0x" + BigInt(fromId).toString(16),
    to_id: "0x" + BigInt(toId).toString(16),
    nonce: "0x" + BigInt(nonce).toString(16),
    args: args,
  };
  return rawL2Transaction;
}

function buildStorageKey(storagePosition: string) {
  let key = storagePosition.slice(2);
  // If b is larger than len(h), b will be cropped from the left.
  if (key.length > 64) {
    key = key.slice(0, 64);
  }
  if (key.length < 64) {
    key = "0".repeat(64 - key.length) + key;
  }
  logger.debug("storage position:", key);
  return "0x" + key;
}

async function ethCallTx(
  txCallObj: TransactionCallObject,
  rpc: GodwokenClient,
  blockNumber?: U64
): Promise<RunResult> {
  const rawL2Transaction = await buildEthCallTx(txCallObj, rpc);
  const runResult = await rpc.executeRawL2Transaction(
    rawL2Transaction,
    blockNumber
  );

  return runResult;
}

async function buildEthCallTx(
  txCallObj: TransactionCallObject,
  rpc: GodwokenClient
): Promise<RawL2Transaction> {
  const fromAddress = txCallObj.from;
  const toAddress = txCallObj.to;
  const gas =
    txCallObj.gas || "0x" + BigInt(POLY_MAX_BLOCK_GAS_LIMIT).toString(16);
  const gasPrice =
    txCallObj.gasPrice || "0x" + BigInt(POLY_MIN_GAS_PRICE).toString(16);
  const value = txCallObj.value || "0x0";
  const data = txCallObj.data || "0x";
  let fromId: number | undefined;

  const gasLimitErr = verifyGasLimit(gas, 0);
  if (gasLimitErr) {
    throw gasLimitErr.padContext(buildEthCallTx.name);
  }

  if (!fromAddress) {
    fromId = +envConfig.defaultFromId;
    logger.debug(`use default fromId: ${fromId}`);
  }

  if (fromAddress != null && typeof fromAddress === "string") {
    fromId = await ethAddressToAccountId(fromAddress, rpc);
    logger.debug(`fromId: ${fromId}`);
  }

  if (fromId == null) {
    throw new Error(
      `from id not found by from address: ${fromAddress}, have you deposited?`
    );
  }

  const toId: number | undefined = await ethAddressToAccountId(toAddress, rpc);
  if (toId == null) {
    throw new Error(`to id missing! toAddress: ${toAddress}`);
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
    BigInt(envConfig.chainId),
    fromId,
    toId,
    nonce,
    polyjuiceArgs
  );
  logger.debug(
    `rawL2Transaction: ${JSON.stringify(rawL2Transaction, null, 2)}`
  );
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
    case SUDT_OPERATION_LOG_FLAG:
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
  if (buf.length !== 4 + 4 + 16) {
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
  if (buf.length !== 8 + 8 + 16 + 4 + 4) {
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

  if (offset !== buf.length) {
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

function serializeEthCallParameters(
  ethCallObj: TransactionCallObject,
  blockNumber: GodwokenBlockParameter
): HexString {
  // the gasPrice did not effect eth_call result, so we can remove it from cache key
  const toSerializeObj = {
    from: ethCallObj.from,
    to: ethCallObj.to,
    gas: ethCallObj.gas || "0x",
    data: ethCallObj.data || "0x",
    value: ethCallObj.value || "0x",
    blockNumber: blockNumber ? "0x" + blockNumber?.toString(16) : "0x",
  };
  //console.log("to serialize eth_call cache obj", toSerializeObj);
  return JSON.stringify(toSerializeObj);
}

function getEthCallCacheKey(
  serializeEthCallParams: string,
  tipBlockHash: HexString,
  memPoolStateRoot: HexString
) {
  const hash = "0x" + keccakFromString(serializeEthCallParams).toString("hex");
  const id = `0x${tipBlockHash.slice(2, 18)}${memPoolStateRoot.slice(
    2,
    18
  )}${hash.slice(2, 18)}`;
  return id;
}
