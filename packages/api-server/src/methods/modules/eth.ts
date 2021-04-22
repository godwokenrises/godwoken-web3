import { Callback } from '../types';
import * as Knex from 'knex';
import { RPC } from 'ckb-js-toolkit';
import { middleware, validators } from '../validator';
import { FilterManager } from '../../cache/index';
import { FilterObject, FilterType } from '../../cache/types';
import { camelToSnake, toHex, handleBlockParamter } from '../../util';
import { core, utils, Script } from '@ckb-lumos/base';
import { normalizers, Reader } from 'ckb-js-toolkit';
import { types, schemas } from '@godwoken-web3/godwoken';
const Config = require('../../../config/eth.json');
const { blake2bInit, blake2bUpdate, blake2bFinal } = require('blakejs');
const blake2b = require('blake2b');
require('dotenv').config({ path: './.env' });

const POLYJUICE_ACCOUNT_CODE_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000001';
const POLYJUICE_VALIDATOR_CODE_HASH =
  '0x4b83dd9158e7f3407bbc3fefbcac5dfeecf40221ea28706eb97fd653d375e00c';
const POLYJUICE_SYSTEM_PREFIX = 255;
const POLYJUICE_CONTRACT_CODE = 1;
const POLYJUICE_DESTRUCTED = 2;
const GW_KEY_BYTES = 32;
const GW_ACCOUNT_KV = 0;
const SUDT_ID = 1;
const CKB_PERSONALIZATION = 'ckb-default-hash';
export class Eth {
  knex: Knex;
  private filterManager: FilterManager;

  rpc: RPC;
  constructor() {
    this.knex = require('knex')({
      client: 'postgresql',
      connection: process.env.DATABASE_URL
    });

    this.filterManager = new FilterManager();
    console.log('node_rpc', process.env.GODWOKEN_JSON_RPC);
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);

    this.getBlockByNumber = middleware(this.getBlockByNumber.bind(this), 1, [validators.hexNumber])
    // TODO: required 2 arguments
    this.getBlockByHash = middleware(this.getBlockByHash.bind(this), 1, [validators.blockHash])
    // TODO: required 2 arguments
    this.getBalance = middleware(this.getBalance.bind(this), 1, [validators.address])
    this.getStorageAt = middleware(this.getStorageAt.bind(this), 2, [validators.address, validators.hexNumber])
    this.getTransactionCount = middleware(this.getTransactionCount.bind(this), 1, [validators.address])
    this.getBlockTransactionCountByHash = middleware(this.getBlockTransactionCountByHash.bind(this), 1, [validators.blockHash])
    this.getBlockTransactionCountByNumber = middleware(this.getBlockTransactionCountByNumber.bind(this), 1, [validators.hexNumberOrTag])
    this.getUncleCountByBlockHash = middleware(this.getUncleCountByBlockHash.bind(this), 1, [validators.blockHash])
    this.getCode = middleware(this.getCode.bind(this), 1, [validators.address]);
    this.getTransactionByHash = middleware(this.getTransactionByHash.bind(this), 1, [validators.txHash]);
    this.getTransactionByBlockHashAndIndex = middleware(this.getTransactionByBlockHashAndIndex.bind(this), 2, [validators.blockHash, validators.hexNumber]);
    this.getTransactionByBlockNumberAndIndex = middleware(this.getTransactionByBlockNumberAndIndex.bind(this), 2, [validators.hexNumber, validators.hexNumber]);
    this.getTransactionReceipt = middleware(this.getTransactionReceipt.bind(this), 1, [validators.txHash]);
    this.getUncleByBlockHashAndIndex = middleware(this.getUncleByBlockHashAndIndex.bind(this), 2, [validators.blockHash, validators.hexNumber]);
    this.getUncleByBlockNumberAndIndex = middleware(this.getUncleByBlockNumberAndIndex.bind(this), 2, [validators.hexNumber, validators.hexNumber]);
    this.call = middleware(this.call.bind(this), 1, [validators.ethCallParams]);
    this.estimateGas = middleware(this.estimateGas.bind(this), 1, [validators.ethCallParams]);
    this.newFilter = middleware(this.newFilter.bind(this), 1, [validators.newFilterParams]);
  }

  /**
   * Returns the current protocol version
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * protocol version as the second argument
   */
  protocolVersion(args: [], callback: Callback) {
    callback(null, Config.eth_protocolVersion);
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
    // const result = await this.rpc.last_synced();
    const blockData = await this.knex
      .select('number')
      .from('blocks')
      .orderBy('number', 'desc')
      .limit(1);
    if (blockData.length === 1) {
      let blockHeight = '0x' + BigInt(blockData[0].number).toString(16);
      const result = {
        startingBlock: blockHeight,
        currentBlock: blockHeight,
        highestBlock: blockHeight
      };
      callback(null, result);
    } else {
      callback(null, false);
    }
  }

  /**
   * Returns client coinbase address, which is always zero hashes
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 20 bytes 0 hex string as the second argument.
   */
  coinbase(args: [], callback: Callback) {
    callback(null, '0x' + '0'.repeat(40));
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
    callback(null, '0x0');
  }

  async gasPrice(args: [], callback: Callback) {
    callback(null, '0x1');
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
    const blockData = await this.knex
      .select('number')
      .from('blocks')
      .orderBy('number', 'desc')
      .limit(1);
    if (blockData.length === 1) {
      let blockHeight = '0x' + BigInt(blockData[0].number).toString(16);
      callback(null, blockHeight);
    } else {
      callback(null, null);
    }
  }

  // TODO: second arguments
  async getBalance(args: [string, string], callback: Callback) {
    const address = args[0];
    const accountId = await allTypeEthAddressToAccountId(this.rpc, address);
    const balance = await this.rpc.gw_getBalance(accountId, SUDT_ID);
    const balanceHex = "0x" + BigInt(balance).toString(16);
    callback(null, balanceHex);
  }

  async getStorageAt(args: [string, string, string], callback: Callback) {
    const address = args[0];
    const accountId = ethContractAddressToAccountId(address);
    const storagePosition = args[1];
    const key = buildStorageKey(storagePosition);
    const value = await this.rpc.gw_getStorageAt(accountId, key);
    callback(null, value);
  }

  /**
   * 
   * @param args [address, QUANTITY|TAG]
   * @param callback 
   */
  async getTransactionCount(args: [string, string], callback: Callback) {
    const address = args[0];
    const accountId = await allTypeEthAddressToAccountId(this.rpc, address)
    const nonce = await this.rpc.gw_getNonce(accountId);
    const transactionCount = "0x" + BigInt(nonce).toString(16);
    callback(null, transactionCount);
  }

  async getCode(args: [string, string], callback: Callback) {
    const address = args[0];
    const accountId = ethContractAddressToAccountId(address);
    const contractCodeKey = polyjuiceBuildContractCodeKey(accountId);
    const dataHash = await this.rpc.gw_getStorageAt(accountId, contractCodeKey);
    const data = await this.rpc.gw_getData(dataHash);
    callback(null, data);
  }

  // TODO: no eth_call now
  // TODO: verify parameters
  async call(
    args: [any],
    callback: Callback
  ) {
    callback(null, "0x");
    
    // const fromAddress = args[0];
    // const toAddress = args[1];
    // const gas = BigInt(args[2]);
    // const gasPrice = BigInt(args[3]);
    // const value = BigInt(args[4]);
    // const data = args[5];
    // const fromScriptHash = ethAddressToScriptHash(fromAddress);
    // const fromAccountId = await this.rpc.gw_getAccountIdByScriptHash(
    //   fromScriptHash
    // );
    // const nonce = await this.rpc.gw_getNonce(fromAccountId);
    // // const toScriptHash = ethContractAddressToScriptHash(toAddress);
    // // const toAccountId = await this.rpc.gw_getAccountIdByScriptHash(
    // //   toScriptHash
    // // );
    // const toAccountId = ethContractAddressToAccountId(toAddress);
    // const polyjuiceArgs = buildPolyjuiceArgs(
    //   toAccountId,
    //   gas,
    //   gasPrice,
    //   value,
    //   data
    // );
    // const rawL2Transaction = buildRawL2Transaction(
    //   fromAccountId,
    //   toAccountId,
    //   nonce,
    //   polyjuiceArgs
    // );
    // console.log(rawL2Transaction);
    // const rawL2TransactionHex = new Reader(
    //   schemas.SerializeRawL2Transaction(
    //     types.NormalizeRawL2Transaction(rawL2Transaction)
    //   )
    // ).serializeJson();
    // const runResult = await this.rpc.gw_executeRawL2Transaction(
    //   rawL2TransactionHex
    // );
    // console.log('RunResult:', runResult);
    // callback(null, runResult.return_data);
  }

  async gw_executeL2Tranaction(args: any[], callback: Callback) {
    const result = await this.rpc.gw_executeL2Tranaction(...args);
    callback(null, result);
  }

  async gw_submitL2Transaction(args: any[], callback: Callback) {
    const result = await this.rpc.gw_submitL2Transaction(...args);
    callback(null, result);
  }

  // TODO: no estimateGas now
  // TODO: verify parameters
  async estimateGas(
    args: [any],
    callback: Callback
  ) {
    callback(null ,"0x0");

    // const fromAddress = args[0];
    // const toAddress = args[1];
    // const gas = BigInt(args[2]);
    // const gasPrice = BigInt(args[3]);
    // const value = BigInt(args[4]);
    // const data = args[5];

    // const obj = args[0];
    // const fromAddress = obj.from;
    // const toAddress = obj.to;
    // const gas = obj.gas;
    // const gasPrice = obj.gasPrice;
    // const value = obj.value;
    // const data = obj.data;

    // const fromScriptHash = ethAddressToScriptHash(fromAddress);
    // const fromAccountId = await this.rpc.gw_getAccountIdByScriptHash(
    //   fromScriptHash
    // );
    // const nonce = await this.rpc.gw_getNonce(fromAccountId);
    // // const toScriptHash = ethContractAddressToScriptHash(toAddress);
    // // const toAccountId = await this.rpc.gw_getAccountIdByScriptHash(
    // //   toScriptHash
    // // );
    // const toAccountId = ethContractAddressToAccountId(toAddress);
    // const polyjuiceArgs = buildPolyjuiceArgs(
    //   toAccountId,
    //   gas,
    //   gasPrice,
    //   value,
    //   data
    // );
    // const rawL2Transaction = buildRawL2Transaction(
    //   fromAccountId,
    //   toAccountId,
    //   nonce,
    //   polyjuiceArgs
    // );
    // console.log(rawL2Transaction);
    // const rawL2TransactionHex = new Reader(
    //   schemas.SerializeRawL2Transaction(
    //     types.NormalizeRawL2Transaction(rawL2Transaction)
    //   )
    // ).serializeJson();
    // const runResult = await this.rpc.gw_executeRawL2Transaction(
    //   rawL2TransactionHex
    // );
    // console.log('RunResult:', runResult);
    // // TODO gas used info
    // callback(null, runResult.return_data);
  }

  // TODO: second argument
  async getBlockByHash(args: [string], callback: Callback) {
    const blockData = await this.knex
      .select()
      .table('blocks')
      .where({ hash: args[0] });
    const transactionData = await this.knex
      .select('hash')
      .table('transactions')
      .where({ block_hash: args[0] });
    if (blockData.length === 1) {
      const txHashes = transactionData.map((item) => item.hash);
      let block = dbBlockToApiBlock(blockData[0]);
      block.transactions = txHashes as any;
      callback(null, block);
    } else {
      callback(null, null);
    }
  }

  async getBlockByNumber(args: [string], callback: Callback) {
    // TODO handle "earliest", "latest" or "pending"
    const blockData = await this.knex
      .select()
      .table('blocks')
      .where({ number: BigInt(args[0]) });
    if (blockData.length === 1) {
      const transactionData = await this.knex
        .select('hash')
        .table('transactions')
        .where({ block_number: BigInt(args[0]) });
      const txHashes = transactionData.map((item) => item.hash);
      let block = dbBlockToApiBlock(blockData[0]);
      block.transactions = txHashes as any;
      callback(null, block);
    } else {
      callback(null, null);
    }
  }

  /**
   * 
   * @param args [blockHash]
   * @param callback 
   */
  async getBlockTransactionCountByHash(args: [string], callback: Callback) {
    const transactionData = await this.knex
      .count()
      .table('transactions')
      .where({ block_hash: args[0] });
    if (transactionData.length === 1) {
      callback(null, '0x' + BigInt(transactionData[0].count).toString(16));
    } else {
      callback(null, null);
    }
  }

  /**
   * 
   * @param args [blockNumber]
   * @param callback 
   */
  async getBlockTransactionCountByNumber(args: [string], callback: Callback) {
    const blockNumber = await this.getBlockNumberOrLatest(args[0]);

    const transactionData = await this.knex
      .count()
      .table('transactions')
      .where({ block_number: BigInt(blockNumber) });

    if (transactionData.length === 1) {
      callback(null, '0x' + BigInt(transactionData[0].count).toString(16));
    } else {
      callback(null, null);
    }
  }

  async getUncleByBlockHashAndIndex(args: [string, string], callback: Callback) {
    callback(null, null);
  }

  async getUncleByBlockNumberAndIndex(args: [string, string], callback: Callback) {
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

  async getCompilers(args: [], callback: Callback) {
    callback(null, []);
  }

  async getTransactionByHash(args: [string], callback: Callback) {
    const transactionData = await this.knex
      .select()
      .table('transactions')
      .where({ hash: args[0] });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
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
    const transactionData = await this.knex
      .select()
      .table('transactions')
      .where({ block_hash: args[0], transaction_index: BigInt(args[1]) });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
  }

  async getTransactionByBlockNumberAndIndex(
    args: [string, string],
    callback: Callback
  ) {
    const transactionData = await this.knex
      .select()
      .table('transactions')
      .where({
        block_number: BigInt(args[0]),
        transaction_index: BigInt(args[1])
      });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
  }

  async getTransactionReceipt(args: [string], callback: Callback) {
    const transactionData = await this.knex
      .select()
      .table('transactions')
      .where({ hash: args[0] });
    if (transactionData.length === 1) {
      const logsData = await this.knex
        .select()
        .table('logs')
        .where({ transaction_hash: args[0] });
      const logs = logsData.map((item) => dbLogToApiLog(item));
      let transactionReceipt = dbTransactionToApiTransactionReceipt(
        transactionData[0]
      );
      transactionReceipt.logs = logs as any;
      callback(null, transactionReceipt);
    } else {
      callback(null, null);
    }
  }

  /* #region filter-related api methods */
  newFilter(args: [FilterObject], callback: Callback) {
    const filter = args[0];
    const filter_id = this.filterManager.install(filter);
    callback(null, toHex(filter_id));
  }

  newBlockFilter(args: [], callback: Callback) {
    const filter_id = this.filterManager.install(1); // 1 for block filter
    callback(null, toHex(filter_id));
  }

  newPendingTransactionFilter(args: [], callback: Callback) {
    const filter_id = this.filterManager.install(2); // 2 for pending tx filter
    callback(null, toHex(filter_id));
  }

  uninstallFilter(args: [string], callback: Callback) {
    const filter_id = parseInt(args[0], 16);
    const isUninstalled = this.filterManager.uninstall(filter_id);
    callback(null, isUninstalled);
  }

  async getFilterLogs(args: [string], callback: Callback) {
    const filter_id = parseInt(args[0], 16);
    const filter = this.filterManager.get(filter_id);

    if (!filter) return callback(null, []);

    if (filter === 1) {
      // block filter
      const blocks = await this.knex.select().table('blocks').where({});
      const block_hashes = blocks.map((block) => block.hash);
      return callback(null, block_hashes);
    }

    if (filter === 2) {
      // pending tx filter, not supported.
      return callback(null, []);
    }

    return this.getLogs([filter!], callback);
  }

  async getFilterChanges(args: [string], callback: Callback) {
    const filter_id = parseInt(args[0], 16);
    const filter = this.filterManager.get(filter_id);

    if (!filter) return callback(null, []);

    //***** handle block-filter
    if (filter === 1) {
      const last_poll_block_number = this.filterManager.getLastPoll(filter_id);
      // get all block occured since last poll
      // ( block_number > last_poll_cache_block_number )
      const blocks = await this.knex
        .select()
        .table('blocks')
        .where('number', '>', BigInt(last_poll_block_number).toString())
        .orderBy('number', 'desc');

      if (blocks.length === 0) return callback(null, []);

      // remember to update the last poll cache
      // blocks[0] is now the higest block number(meaning it is the newest cache block number)
      this.filterManager.updateLastPoll(filter_id, blocks[0].number);
      const block_hashes = blocks.map((block) => block.hash);
      return callback(null, block_hashes);
    }

    //***** handle pending-tx-filter, currently not supported.
    if (filter === 2) {
      return callback(null, []);
    }

    //***** handle normal-filter
    const last_poll_log_id = this.filterManager.getLastPoll(filter_id);

    // filter non-empty query params
    const params = [
      {
        name: 'address',
        value: filter?.address
      },
      {
        name: 'blockHash',
        value: filter?.blockHash
      },
      {
        name: 'fromBlock',
        value: filter?.fromBlock
      },
      {
        name: 'toBlock',
        value: filter?.toBlock
      },
      {
        name: 'topics',
        value: filter?.topics
      }
    ]
      .filter((p) => p.value !== undefined)
      .map((p) => {
        return { [p.name]: p.value };
      });
    var q = {};
    var query = params.map((p) => Object.assign(q, p))[0];

    //@ts-ignore
    const topics: [] = query.topics ? query.topics : [];
    const from_block = handleBlockParamter(
      filter.fromBlock ? filter.fromBlock : 'earliest'
    );
    const to_block = handleBlockParamter(
      filter.toBlock ? filter.toBlock : 'latest'
    );

    // we will pass query object dirrectly to knex where method.
    // so here need to delete the un-querable key.
    delete query.fromBlock;
    delete query.toBlock;
    delete query.topics;

    // if blockHash exits, fromBlock and toBlock is not allowed.
    if (filter.blockHash) {
      const logsData = await this.knex
        .select()
        .table('logs')
        .where(camelToSnake(query))
        .where('topics', '@>', topics)
        // select the recent whose log_id is greater than lastPollCache's log_id
        .where('id', '>', last_poll_log_id!.toString());

      if (logsData.length === 0) return callback(null, []);

      // remember to update the last poll cache
      // logsData[0] is now the higest log id(meaning it is the newest cache log id)
      this.filterManager.updateLastPoll(filter_id, logsData[0].id);

      const logs = logsData.map((log) => dbLogToApiLog(log));
      return callback(null, logs);
    }

    const logsData = await this.knex
      .select()
      .table('logs')
      .where(camelToSnake(query))
      /*
          todo: incomplete topics query. (currently only impl a simple topic query method)
          Topics are order-dependent. 
          Each topic can also be an array of DATA with “or” options.

          [example]:
          
            A transaction with a log with topics [A, B], 
            will be matched by the following topic filters:

              1. [] “anything”
              2. [A] “A in first position (and anything after)”
              3. [null, B] “anything in first position AND B in second position (and anything after)”
              4. [A, B] “A in first position AND B in second position (and anything after)”
              5. [[A, B], [A, B]] “(A OR B) in first position AND (A OR B) in second position (and anything after)”
              
          source: https://eth.wiki/json-rpc/API#eth_newFilter
        */
      .where('topics', '@>', topics)
      .where('block_number', '>', from_block?.toString())
      .where('block_number', '<', to_block?.toString())
      // select the recent whose log_id is greater than lastPollCache's log_id
      .where('id', '>', last_poll_log_id!.toString());

    if (logsData.length === 0) return callback(null, []);

    // remember to update the last poll cache
    // logsData[0] is now the higest log id(meaning it is the newest cache log id)
    this.filterManager.updateLastPoll(filter_id, logsData[0].id);

    const logs = logsData.map((log) => dbLogToApiLog(log));
    return callback(null, logs);
  }

  async getLogs(args: [FilterObject], callback: Callback) {
    const filter = args[0];

    //@ts-ignore
    const topics: [] = filter.topics ? filter.topics : [];
    const from_block = handleBlockParamter(
      filter.fromBlock ? filter.fromBlock : 'earliest'
    );
    const to_block = handleBlockParamter(
      filter.toBlock ? filter.toBlock : 'latest'
    );

    delete filter.fromBlock;
    delete filter.toBlock;
    delete filter.topics;

    // if blockHash exits, fromBlock and toBlock is not allowed.
    if (filter.blockHash) {
      const logsData = await this.knex
        .select()
        .table('logs')
        .where(camelToSnake(filter))
        .where('topics', '@>', topics);
      const logs = logsData.map((log) => dbLogToApiLog(log));
      return callback(null, logs);
    }

    const logsData = await this.knex
      .select()
      .table('logs')
      .where(camelToSnake(filter))
      /*
          todo: incomplete topics matching. (currently only impl a simple topic query method)
          Topics are order-dependent. 
          Each topic can also be an array of DATA with “or” options.

          [example]:

            A transaction with a log with topics [A, B], 
            will be matched by the following topic filters:

              1. [] “anything”
              2. [A] “A in first position (and anything after)”
              3. [null, B] “anything in first position AND B in second position (and anything after)”
              4. [A, B] “A in first position AND B in second position (and anything after)”
              5. [[A, B], [A, B]] “(A OR B) in first position AND (A OR B) in second position (and anything after)”
              
          source: https://eth.wiki/json-rpc/API#eth_newFilter
        */
      .where('topics', '@>', topics)
      .where('block_number', '>', from_block?.toString())
      .where('block_number', '<', to_block?.toString());
    const logs = logsData.map((log) => dbLogToApiLog(log));
    return callback(null, logs);
  }
  /* #endregion */

  private async getTipNumber(): Promise<string> {
    const result = await this.knex
      .table("blocks")
      .max('number', { as: "tipNumber" });
    const tipNumber = result[0].tipNumber;
    return tipNumber;
  }

  private async getBlockNumberOrLatest(num: string): Promise<string> {
    if (num === "latest") {
      return await this.getTipNumber();
    }
    return num;
  }
}

function dbBlockToApiBlock(block: any) {
  return {
    number: '0x' + BigInt(block.number).toString(16),
    hash: block.hash,
    parentHash: block.parent_hash,
    gasLimit: '0x' + BigInt(block.gas_limit).toString(16),
    gasLrice: '0x' + BigInt(block.gas_used).toString(16),
    miner: block.miner,
    size: '0x' + BigInt(block.size).toString(16),
    logsBloom: block.logs_bloom,
    transactions: [],
    timestamp: new Date(block.timestamp).getTime() / 1000,
    // use default value
    mixHash: '0x' + '0'.repeat(64),
    nonce: '0x' + '0'.repeat(16),
    stateRoot: '0x' + '0'.repeat(64),
    sha3Uncles: '0x' + '0'.repeat(64),
    receiptsRoot: '0x' + '0'.repeat(64),
    transactionsRoot: '0x' + '0'.repeat(64),
    uncles: [],
    totalDifficulty: '0x0',
    extraData: '0x'
  };
}

function dbTransactionToApiTransaction(transaction: any) {
  return {
    hash: transaction.hash,
    blockHash: transaction.block_hash,
    blockNumber: '0x' + BigInt(transaction.block_number).toString(16),
    transactionIndex: '0x' + BigInt(transaction.transaction_index).toString(16),
    from: transaction.from_address,
    to: transaction.to_address,
    gas: '0x' + BigInt(transaction.gas_limit).toString(16),
    gasPrice: '0x' + BigInt(transaction.gas_price).toString(16),
    input: transaction.input,
    nonce: '0x' + BigInt(transaction.nonce).toString(16),
    value: '0x' + BigInt(transaction.value).toString(16),
    v: transaction.v,
    r: transaction.r,
    s: transaction.s
  };
}

function dbTransactionToApiTransactionReceipt(transaction: any) {
  return {
    transactionHash: transaction.hash,
    blockHash: transaction.block_hash,
    blockNumber: '0x' + BigInt(transaction.block_number).toString(16),
    transactionIndex: '0x' + BigInt(transaction.transaction_index).toString(16),
    gasUsed: '0x' + BigInt(transaction.gas_used).toString(16),
    cumulativeGasUsed:
      '0x' + BigInt(transaction.cumulative_gas_used).toString(16),
    logsBloom: transaction.logs_bloom,
    logs: [],
    contractAddress: transaction.contract_address,
    status: transaction.status ? '0x1' : '0x0'
  };
}

function dbLogToApiLog(log: any) {
  return {
    address: log.address,
    blockHash: log.block_hash,
    blockNumber: '0x' + BigInt(log.block_number).toString(16),
    transactionIndex: '0x' + BigInt(log.transaction_index).toString(16),
    transactionHash: log.transaction_hash,
    data: log.data,
    logIndex: '0x' + BigInt(log.transaction_index).toString(16),
    topics: log.topics,
    removed: false
  };
}

function ethAddressToScriptHash(address: string) {
  const script = {
    code_hash: POLYJUICE_ACCOUNT_CODE_HASH,
    hash_type: 'data',
    args: address
  };
  console.log('script: ', script);
  const scriptHash = utils
    .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
  return scriptHash;
}

function ethContractAddressToAccountId(address: string): number{
  return +address;
}

// function ethContractAddressToScriptHash(address: string) {
//   const script = {
//     code_hash: POLYJUICE_VALIDATOR_CODE_HASH,
//     hash_type: 'data',
//     args: address
//   };
//   console.log('script: ', script);
//   const scriptHash = utils
//     .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
//     .serializeJson();
//   return scriptHash;
// }

function gwBuildAccountKey(accountId: number, key: Uint8Array) {
  const buffer = Buffer.from(CKB_PERSONALIZATION);
  const personal = new Uint8Array(buffer);
  let context = blake2b(32, null, null, personal);
  const accountIdArray = new Uint8Array(uint32ToLeBytes(accountId) as number[]);
  const type = new Uint8Array([GW_ACCOUNT_KV]);
  context = context.update(accountIdArray);
  context = context.update(type);
  context = context.update(key);
  const hash = context.digest();
  return hash;
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
  return '0x' + Buffer.from(key).toString('hex');
}

function ethStoragePositionToRawKey(ethStoragePosition: string) {}

function uint32ToLeBytes(id: number) {
  let hex = id.toString(16);
  if (hex.length < 8) {
    hex = '0'.repeat(8 - hex.length) + hex;
  }
  const array = hex
    .match(/../g)
    ?.reverse()
    .map((x) => {
      return parseInt('0x' + x);
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
  const callKind = toId > 0 ? 0 : 3;
  const gasLimitBuf = Buffer.alloc(8);
  const gasPriceBuf = Buffer.alloc(16);
  const valueBuf = Buffer.alloc(32);
  const dataSizeBuf = Buffer.alloc(4);
  const dataBuf = Buffer.from(data.slice(2), 'hex');
  gasLimitBuf.writeBigUInt64LE(gas);
  gasPriceBuf.writeBigUInt64LE(gasPrice);
  valueBuf.writeBigUInt64BE(value);
  dataSizeBuf.writeUInt32LE(dataBuf.length);
  const argsLength = 1 + 1 + 8 + 16 + 32 + 4 + dataBuf.length;
  const argsBuf = Buffer.alloc(argsLength);
  argsBuf[0] = callKind;
  argsBuf[1] = 0;
  gasLimitBuf.copy(argsBuf, 2);
  gasPriceBuf.copy(argsBuf, 10);
  valueBuf.copy(argsBuf, 26);
  dataSizeBuf.copy(argsBuf, 58);
  dataBuf.copy(argsBuf, 62);
  const argsHex = '0x' + argsBuf.toString('hex');
  return argsHex;
}

function buildRawL2Transaction(
  fromId: number,
  toId: number,
  nonce: number,
  args: string
) {
  const rawL2Transaction = {
    from_id: fromId,
    to_id: toId,
    nonce: nonce,
    args: args
  };
  return rawL2Transaction;
}

function buildStorageKey(storagePosition: string) {
  let key = storagePosition.slice(2);
  if (key.length < 64) {
    key = '0'.repeat(64 - key.length) + key;
  }
  // const buf = Buffer.from(key, "hex");
  // return new Uint8Array(buf);
  return '0x' + key;
}

async function allTypeEthAddressToAccountId(rpc: RPC, address: string): Promise<number> {
  const scriptHash = ethAddressToScriptHash(address);
  let accountId = await rpc.gw_getAccountIdByScriptHash(scriptHash);
  if (accountId === null || accountId === undefined) {
    accountId = ethContractAddressToAccountId(address);
  }
  return accountId;
}