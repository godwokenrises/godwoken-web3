import { Callback } from '../types';
import * as Knex from 'knex';
const Config = require('../../../config/eth.json');
import { middleware, validators } from '../validator';
import { Filter } from '../../cache/index';
import { FilterObject, FilterType } from '../../cache/types';
require('dotenv').config({ path: "./.env" })

export class Eth {

  knex: Knex;
  private filterManager: Filter;
  
  constructor() {

    this.knex = require("knex")({
      client: "postgresql",
      connection: process.env.DATABASE_URL,
    });

    this.filterManager = new Filter();
    
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
    callback(null, BigInt(filter_id).toString(16));
  }

  newBlockFilter(args: [], callback: Callback) {
    const filter_id = this.filterManager.install(1); // 1 for block filter
    callback(null, BigInt(filter_id).toString(16));
  }

  newPendingTransactionFilter(args: [], callback: Callback) {
    const filter_id = this.filterManager.install(2); // 2 for pending tx filter
    callback(null, BigInt(filter_id).toString(16));
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
      callback(null, []);

    if(filter === 1){// block filter
      const blocks = await this.knex.select().table("blocks").where({}); 
      const block_hashes = blocks.map(block => block.hash);
      return callback(null, block_hashes); 
    }

    if(filter === 2){// pending tx filter, not supported.
      return callback(null, []);
    }
    
    return this.getLogs([filter!], callback);
  }

  async getFilterChanges(args: [string], callback: Callback) {
    const filter_id = parseInt(args[0], 16);
    const filter = this.filterManager.get(filter_id); 
    
    if(!filter)
      callback(null, []); 
    
    if(filter === 1) {// block-filter
      const last_poll_block_number = this.filterManager.getLastPoll(filter_id);

      // get all block occured since last poll 
      // ( block_number > last_poll_cache_block_number )
      const blocks = await this.knex.select().table("blocks")
                              .where(
                                'number', '>', BigInt(last_poll_block_number).toString()
                              )
                              .orderBy('number', 'desc');
      // remember to update the last poll cache
      // blocks[0] is now the higest block number(meaning the newest cache block number)
      if(blocks.length > 0) {
        this.filterManager.updateLastPollCache(filter_id, blocks[0].number);
      }
      const block_hashes = blocks.map(block => block.hash);
      return callback(null, block_hashes); 
    }

    if(filter === 2) {// pending-tx-filter, not supported.
      return callback(null, []);
    }

    // normal-filter
    // filter the empty query params
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
    const q = {};
    var query = params.map(q => Object.assign(q, q))[0];
    
    
    if(query.blockHash){
      delete query.fromBlock;
      delete query.toBlock;
      await this.knex.select().table("logs")
        .where({
          block_hash: query.blockHash,

        })
    }


    // select the recent logs from db
    // whose log_id is greater than lastPollCache's log_id
    await this.knex.select().table("logs").where(query).where
    
  }

  async getLogs(args: [FilterObject], callback: Callback) {

    const filter = args[0];
    
    if (filter.blockHash) {

      const logsData = await this.knex.select().table("logs")
      .where({ // todo: handle address topis undefind
          block_hash: filter.blockHash, 
          address: filter.address, 
          topics: filter.topics 
       });
      callback( null, logsData.map( log => dbLogToApiLog(log)) );

    }else{ // todo: handle block parameter

      const logsData = await this.knex.select().table("logs")
      .where({ //todo: handle block ranges
          address: filter.address, 
          topics: filter.topics 
       })
       //@ts-ignore
       // todo: handler block number from hex string to number
      .whereBetween('block_number', [filter.fromBlock, filter.toBlock]);
      callback( null, logsData.map( log => dbLogToApiLog(log)) );
    }
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
