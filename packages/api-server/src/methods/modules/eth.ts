import { Callback } from '../types';
import * as Knex from 'knex';
const Config = require('../../../config/eth.json');
import { middleware, validators } from '../validator';
import { FilterManager } from '../../cache/index';
import { FilterObject, FilterType } from '../../cache/types';
import { camelToSnake, toHex, handleBlockParamter } from '../../util';
require('dotenv').config({ path: "./.env" });

export class Eth {

  knex: Knex;
  private filterManager: FilterManager;
  
  constructor() {

    this.knex = require("knex")({
      client: "postgresql",
      connection: process.env.DATABASE_URL,
    });

    this.filterManager = new FilterManager();
    
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
  syncing(args: [], callback: Callback) {

  }

  /**
   * Returns client coinbase address, which is always zero hashes
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * 20 bytes 0 hex string as the second argument. 
   */
  coinbase(args: [], callback: Callback) {
    callback(null, '0x' + '0'.repeat(40))
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

  gasPrice(args: [], callback: Callback) {

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

  blockNumber(args: [], callback: Callback) {

  }

  getBalance(args: [], callback: Callback) {

  }

  async getBlockByHash(args: [string], callback: Callback) {
    const blockData = await this.knex.select().table("blocks").where({ hash: args[0] });
    const transactionData = await this.knex.select("hash").table("transactions").where({ block_hash: args[0] });
    if (blockData.length === 1) {
      const txHashes = transactionData.map(item => item.hash);
      let block = dbBlockToApiBlock(blockData[0]);
      block.transactions = txHashes as any;
      callback(null, block);
    } else {
      callback(null, null);
    }
  }

  async getBlockByNumber(args: [string], callback: Callback) {
    // TODO handle "earliest", "latest" or "pending"
    const blockData = await this.knex.select().table("blocks").where({ number: BigInt(args[0]) });
    if (blockData.length === 1) {
      const transactionData = await this.knex.select("hash").table("transactions").where({ block_number: BigInt(args[0]) });
      const txHashes = transactionData.map(item => item.hash);
      let block = dbBlockToApiBlock(blockData[0]);
      block.transactions = txHashes as any;
      callback(null, block);
    } else {
      callback(null, null);
    }
  }

  async getBlockTransactionCountByHash(args: [string], callback: Callback) {
    const transactionData = await this.knex.count().table("transactions").where({ block_hash: args[0] });
    if (transactionData.length === 1) {
      callback(null, "0x" + BigInt(transactionData[0].count).toString(16));
    } else {
      callback(null, null);
    }
  }

  async getBlockTransactionCountByNumber(args: [string], callback: Callback) {
    const transactionData = await this.knex.count().table("transactions").where({ block_number: BigInt(args[0]) });
    if (transactionData.length === 1) {
      callback(null, "0x" + BigInt(transactionData[0].count).toString(16));
    } else {
      callback(null, null);
    }
  }

  async getTransactionByHash(args: [string], callback: Callback) {
    const transactionData = await this.knex.select().table("transactions").where({ hash: args[0] });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
  }

  async getTransactionByBlockHashAndIndex(args: [string, string], callback: Callback) {
    const transactionData = await this.knex.select().table("transactions").where({ block_hash: args[0], transaction_index: BigInt(args[1]) });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
  }

  async getTransactionByBlockNumberAndIndex(args: [string, string], callback: Callback) {
    const transactionData = await this.knex.select().table("transactions").where({ block_number: BigInt(args[0]), transaction_index: BigInt(args[1]) });
    if (transactionData.length === 1) {
      let transaction = dbTransactionToApiTransaction(transactionData[0]);
      callback(null, transaction);
    } else {
      callback(null, null);
    }
  }

  async getTransactionReceipt(args: [string], callback: Callback) {
    const transactionData = await this.knex.select().table("transactions").where({ hash: args[0] });
    if (transactionData.length === 1) {
      const logsData = await this.knex.select().table("logs").where({ transaction_hash: args[0] });
      const logs = logsData.map(item => dbLogToApiLog(item));
      let transactionReceipt = dbTransactionToApiTransactionReceipt(transactionData[0]);
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

    if(!filter)
      return callback(null, []);

    if(filter === 1) {// block filter
      const blocks = await this.knex.select().table("blocks").where({}); 
      const block_hashes = blocks.map(block => block.hash);
      return callback(null, block_hashes); 
    }

    if(filter === 2) {// pending tx filter, not supported.
      return callback(null, []);
    }
    
    return this.getLogs([filter!], callback);
  }

  async getFilterChanges(args: [string], callback: Callback) {
    const filter_id = parseInt(args[0], 16);
    const filter = this.filterManager.get(filter_id); 
    
    if(!filter)
      return callback(null, []); 
    
    //***** handle block-filter
    if(filter === 1) { 
      const last_poll_block_number = this.filterManager.getLastPoll(filter_id);
      // get all block occured since last poll 
      // ( block_number > last_poll_cache_block_number )
      const blocks = await this.knex.select().table("blocks")
                              .where(
                                'number', '>', BigInt(last_poll_block_number).toString()
                              )
                              .orderBy('number', 'desc');
  
      if(blocks.length === 0)
          return callback(null, []);
      
      // remember to update the last poll cache
      // blocks[0] is now the higest block number(meaning it is the newest cache block number)
      this.filterManager.updateLastPoll(filter_id, blocks[0].number);
      const block_hashes = blocks.map(block => block.hash);
      return callback(null, block_hashes); 
    }

    //***** handle pending-tx-filter, currently not supported.
    if(filter === 2) { 
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
    ].filter(p => p.value !== undefined)
     .map(p => {
       return { [p.name] : p.value }
     });
    var q = {};
    var query = params.map( p => Object.assign(q, p) )[0];
    
    //@ts-ignore
    const topics: [] = query.topics ? query.topics : [];
    const from_block = handleBlockParamter(filter.fromBlock ? filter.fromBlock : 'earliest');
    const to_block = handleBlockParamter(filter.toBlock ? filter.toBlock : 'latest');

    // we will pass query object dirrectly to knex where method.
    // so here need to delete the un-querable key.
    delete query.fromBlock;
    delete query.toBlock;
    delete query.topics;

    // if blockHash exits, fromBlock and toBlock is not allowed.
    if(filter.blockHash) {
      const logsData = await this.knex.select().table("logs")
        .where(camelToSnake(query))
        .where('topics', '@>', topics)
        // select the recent whose log_id is greater than lastPollCache's log_id
        .where('id', '>', last_poll_log_id!.toString());

      if(logsData.length === 0)
        return callback(null, []);

      // remember to update the last poll cache
      // logsData[0] is now the higest log id(meaning it is the newest cache log id)
      this.filterManager.updateLastPoll(filter_id, logsData[0].id);

      const logs = logsData.map(log => dbLogToApiLog(log));
      return callback(null, logs);
    }

    const logsData = await this.knex.select().table("logs")
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

    if(logsData.length === 0)
      return callback(null, []);

    // remember to update the last poll cache
    // logsData[0] is now the higest log id(meaning it is the newest cache log id)
    this.filterManager.updateLastPoll(filter_id, logsData[0].id);

    const logs = logsData.map(log => dbLogToApiLog(log));
    return callback(null, logs);
  }

  async getLogs(args: [FilterObject], callback: Callback) {
    const filter = args[0];

    //@ts-ignore
    const topics: [] = filter.topics ? filter.topics : [];
    const from_block = handleBlockParamter(filter.fromBlock ? filter.fromBlock : 'earliest');
    const to_block = handleBlockParamter(filter.toBlock ? filter.toBlock : 'latest');

    delete filter.fromBlock;
    delete filter.toBlock;
    delete filter.topics;

    // if blockHash exits, fromBlock and toBlock is not allowed.
    if(filter.blockHash){
      const logsData = await this.knex.select().table("logs")
        .where(camelToSnake(filter))
        .where('topics', '@>', topics)
      const logs = logsData.map(log => dbLogToApiLog(log));
      return callback(null, logs);
    }

    const logsData = await this.knex.select().table("logs")
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
        .where('block_number', '<', to_block?.toString())
    const logs = logsData.map(log => dbLogToApiLog(log));
    return callback(null, logs);
  }
/* #endregion */

}

function dbBlockToApiBlock(block: any) {
  return {
    number: "0x" + BigInt(block.number).toString(16),
    hash: block.hash,
    parentHash: block.parent_hash,
    gasLimit: "0x" + BigInt(block.gas_limit).toString(16),
    gasLrice: "0x" + BigInt(block.gas_used).toString(16),
    miner: block.miner,
    size: "0x" + BigInt(block.size).toString(16),
    logsBloom: block.logs_bloom,
    transactions: [],
    timestamp: (new Date(block.timestamp).getTime()) / 1000,
    // use default value
    mixHash: "0x" + "0".repeat(64),
    nonce: "0x" + "0".repeat(16),
    stateRoot: "0x" + "0".repeat(64),
    sha3Uncles: "0x" + "0".repeat(64),
    receiptsRoot: "0x" + "0".repeat(64),
    transactionsRoot: "0x" + "0".repeat(64),
    uncles: [],
    totalDifficulty: "0x0",
    extraData: "0x"
  };
}

function dbTransactionToApiTransaction(transaction: any) {
  return {
    hash: transaction.hash,
    blockHash: transaction.block_hash,
    blockNumber: "0x" + BigInt(transaction.block_number).toString(16),
    transactionIndex: "0x" + BigInt(transaction.transaction_index).toString(16),
    from: transaction.from_address,
    to: transaction.to_address,
    gas: "0x" + BigInt(transaction.gas_limit).toString(16),
    gasPrice: "0x" + BigInt(transaction.gas_price).toString(16),
    input: transaction.input,
    nonce: "0x" + BigInt(transaction.nonce).toString(16),
    value: "0x" + BigInt(transaction.value).toString(16),
    v: transaction.v,
    r: transaction.r,
    s: transaction.s,
  }
}

function dbTransactionToApiTransactionReceipt(transaction: any) {
  return {
    transactionHash: transaction.hash,
    blockHash: transaction.block_hash,
    blockNumber: "0x" + BigInt(transaction.block_number).toString(16),
    transactionIndex: "0x" + BigInt(transaction.transaction_index).toString(16),
    gasUsed: "0x" + BigInt(transaction.gas_used).toString(16),
    cumulativeGasUsed: "0x" + BigInt(transaction.cumulative_gas_used).toString(16),
    logsBloom: transaction.logs_bloom,
    logs: [],
    contractAddress: transaction.contract_address,
    status: transaction.status ? "0x1" : "0x0",
  }
}

function dbLogToApiLog(log: any) {
  return {
    address: log.address,
    blockHash: log.block_hash,
    blockNumber: "0x" + BigInt(log.block_number).toString(16),
    transactionIndex: "0x" + BigInt(log.transaction_index).toString(16),
    transactionHash: log.transaction_hash,
    data: log.data,
    logIndex: "0x" + BigInt(log.transaction_index).toString(16),
    topics: log.topics,
    removed: false,
  }
}
