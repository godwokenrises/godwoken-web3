import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import { Block, Transaction, Log, ErrorTransactionReceipt } from "./types";
import Knex, { Knex as KnexType } from "knex";
import { LogQueryOption } from "./types";
import { FilterTopic } from "../cache/types";
import { envConfig } from "../base/env-config";
import {
  MAX_QUERY_NUMBER,
  MAX_QUERY_TIME_MILSECS,
  MAX_QUERY_ROUNDS,
} from "./constant";
import { LimitExceedError } from "../methods/error";
import { QUERY_OFFSET_REACHED_END } from "../methods/constant";
import { formatDecimal } from "./helpers";

const poolMax = envConfig.pgPoolMax || 20;
const GLOBAL_KNEX = Knex({
  client: "postgresql",
  connection: envConfig.databaseUrl,
  pool: { min: 2, max: +poolMax },
});

export class Query {
  private knex: KnexType;

  constructor() {
    this.knex = GLOBAL_KNEX;
  }

  async getTipBlockNumber(): Promise<bigint | undefined> {
    const blockData = await this.knex<Block>("blocks")
      .select("number")
      .orderBy("number", "desc")
      .first();

    return toBigIntOpt(blockData?.number);
  }

  async getTipBlock(): Promise<Block | undefined> {
    const block = await this.knex<Block>("blocks")
      .orderBy("number", "desc")
      .first();

    if (!block) {
      return undefined;
    }
    return formatBlock(block);
  }

  async getBlockByHash(blockHash: Hash): Promise<Block | undefined> {
    return await this.getBlock({
      hash: blockHash,
    });
  }

  async getBlockByNumber(blockNumber: bigint): Promise<Block | undefined> {
    return await this.getBlock({
      number: blockNumber,
    });
  }

  private async getBlock(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Block>>>
  ): Promise<Block | undefined> {
    const block = await this.knex<Block>("blocks").where(params).first();

    if (!block) {
      return undefined;
    }
    return formatBlock(block);
  }

  // exclude min & include max;
  async getBlocksByNumbers(
    minBlockNumber: bigint,
    maxBlockNumber: bigint
  ): Promise<Block[]> {
    if (minBlockNumber >= maxBlockNumber) {
      return [];
    }
    const blocks = await this.knex<Block>("blocks")
      .where("number", ">", minBlockNumber)
      .andWhere("number", "<=", maxBlockNumber)
      .orderBy("number", "asc");
    return blocks.map((block) => formatBlock(block));
  }

  async getBlocksAfterBlockNumber(
    number: bigint,
    order: "desc" | "asc" = "desc"
  ): Promise<Block[]> {
    const blocks = await this.knex<Block>("blocks")
      .where("number", ">", number.toString())
      .orderBy("number", order);
    return blocks.map((block) => formatBlock(block));
  }

  async getTransactionsByBlockHash(blockHash: Hash): Promise<Transaction[]> {
    return await this.getTransactions({ block_hash: blockHash });
  }

  async getTransactionsByBlockNumber(
    blockNumber: bigint
  ): Promise<Transaction[]> {
    return await this.getTransactions({ block_number: blockNumber });
  }

  private async getTransactions(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Transaction>>>
  ): Promise<Transaction[]> {
    const transactions = await this.knex<Transaction>("transactions").where(
      params
    );

    return transactions.map((tx) => formatTransaction(tx));
  }

  async getTransactionByHash(hash: Hash): Promise<Transaction | undefined> {
    return await this.getTransaction({
      hash,
    });
  }

  async getTransactionByEthTxHash(
    eth_tx_hash: Hash
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      eth_tx_hash,
    });
  }

  async getTransactionByBlockHashAndIndex(
    blockHash: Hash,
    index: number
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      block_hash: blockHash,
      transaction_index: index,
    });
  }

  async getTransactionByBlockNumberAndIndex(
    blockNumber: bigint,
    index: number
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      block_number: blockNumber,
      transaction_index: index,
    });
  }

  private async getTransaction(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Transaction>>>
  ): Promise<Transaction | undefined> {
    const transaction = await this.knex<Transaction>("transactions")
      .where(params)
      .first();

    if (transaction == null) {
      return undefined;
    }

    return formatTransaction(transaction);
  }

  async getTransactionHashesByBlockHash(blockHash: Hash): Promise<Hash[]> {
    return await this.getTransactionHashes({
      block_hash: blockHash,
    });
  }

  async getTransactionHashesByBlockNumber(
    blockNumber: bigint
  ): Promise<Hash[]> {
    return await this.getTransactionHashes({
      block_number: blockNumber,
    });
  }

  private async getTransactionHashes(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Transaction>>>
  ): Promise<Hash[]> {
    const transactionHashes = await this.knex<Transaction>("transactions")
      .select("hash")
      .where(params);

    return transactionHashes.map((tx) => tx.hash);
  }

  async getTransactionEthHashesByBlockHash(blockHash: Hash): Promise<Hash[]> {
    return await this.getTransactionEthHashes({
      block_hash: blockHash,
    });
  }

  async getTransactionEthHashesByBlockNumber(
    blockNumber: bigint
  ): Promise<Hash[]> {
    return await this.getTransactionEthHashes({
      block_number: blockNumber,
    });
  }

  private async getTransactionEthHashes(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Transaction>>>
  ): Promise<Hash[]> {
    const transactionHashes = await this.knex<Transaction>("transactions")
      .select("eth_tx_hash")
      .where(params);

    return transactionHashes.map((tx) => tx.eth_tx_hash);
  }

  // undefined means not found
  async getBlockTransactionCountByHash(blockHash: Hash): Promise<number> {
    return await this.getBlockTransactionCount({
      block_hash: blockHash,
    });
  }

  async getBlockTransactionCountByNumber(blockNumber: bigint): Promise<number> {
    return await this.getBlockTransactionCount({
      block_number: blockNumber,
    });
  }

  private async getBlockTransactionCount(
    params: Readonly<Partial<KnexType.MaybeRawRecord<Transaction>>>
  ): Promise<number> {
    const data = await this.knex<Transaction>("transactions")
      .where(params)
      .count();

    const count: number = +data[0].count;

    return count;
  }

  async getTransactionAndLogsByHash(
    txHash: Hash
  ): Promise<[Transaction, Log[]] | undefined> {
    const tx = await this.knex<Transaction>("transactions")
      .where({ hash: txHash })
      .first();

    if (!tx) {
      return undefined;
    }

    const logs = await this.knex<Log>("logs").where({
      transaction_hash: txHash,
    });

    return [formatTransaction(tx), logs.map((log) => formatLog(log))];
  }

  async getErrorTransactionReceipt(
    txHash: Hash
  ): Promise<ErrorTransactionReceipt | undefined> {
    const receipt = await this.knex<ErrorTransactionReceipt>(
      "error_transactions"
    )
      .where("hash", txHash)
      .first();

    if (receipt == null) {
      return undefined;
    }

    const result = formatErrorTransactionReceipt(receipt);
    return result;
  }

  private async queryLogsByBlockHash(
    blockHash: HexString,
    address?: HexString | HexString[],
    lastPollId?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const queryLastPollId = lastPollId || -1;
    const queryOffset = offset || 0;
    let logs: Log[] = await this.knex<Log>("logs")
      .modify(buildQueryLogAddress, address)
      .where("block_hash", blockHash)
      .where("id", ">", queryLastPollId.toString(10))
      .orderBy("id", "desc")
      .offset(queryOffset)
      .limit(MAX_QUERY_NUMBER);
    logs = logs.map((log) => formatLog(log));
    return logs;
  }

  private async queryLogsByBlockRange(
    fromBlock: HexNumber,
    toBlock: HexNumber,
    address?: HexString | HexString[],
    lastPollId?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const queryLastPollId = lastPollId || -1;
    const queryOffset = offset || 0;
    let logs: Log[] = await this.knex<Log>("logs")
      .modify(buildQueryLogAddress, address)
      .where("block_number", ">=", fromBlock)
      .where("block_number", "<=", toBlock)
      .where("id", ">", queryLastPollId.toString(10))
      .orderBy("id", "desc")
      .offset(queryOffset)
      .limit(MAX_QUERY_NUMBER);
    logs = logs.map((log) => formatLog(log));
    return logs;
  }

  async getLogs(
    option: LogQueryOption,
    blockHashOrFromBlock: HexString | bigint,
    toBlock?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const address = normalizeLogQueryAddress(option.address);
    const topics = option.topics || [];

    if (typeof blockHashOrFromBlock === "string" && !toBlock) {
      const logs = await this.queryLogsByBlockHash(
        blockHashOrFromBlock,
        address,
        undefined,
        offset
      );

      if (offset && logs.length === 0) {
        throw new Error(QUERY_OFFSET_REACHED_END);
      }

      return filterLogsByTopics(logs, topics);
    }

    if (typeof blockHashOrFromBlock === "bigint" && toBlock) {
      const logs = await this.queryLogsByBlockRange(
        blockHashOrFromBlock.toString(),
        toBlock.toString(),
        address,
        undefined,
        offset
      );

      if (offset && logs.length === 0) {
        throw new Error(QUERY_OFFSET_REACHED_END);
      }

      return filterLogsByTopics(logs, topics);
    }

    throw new Error("invalid params!");
  }

  async getLogsAfterLastPoll(
    lastPollId: bigint,
    option: LogQueryOption,
    blockHashOrFromBlock: HexString | bigint,
    toBlock?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const address = normalizeLogQueryAddress(option.address);
    const topics = option.topics || [];

    if (typeof blockHashOrFromBlock === "string" && !toBlock) {
      const logs = await this.queryLogsByBlockHash(
        blockHashOrFromBlock,
        address,
        lastPollId,
        offset
      );

      if (offset && logs.length === 0) {
        throw new Error(QUERY_OFFSET_REACHED_END);
      }

      return filterLogsByTopics(logs, topics);
    }

    if (typeof blockHashOrFromBlock === "bigint" && toBlock) {
      const logs = await this.queryLogsByBlockRange(
        blockHashOrFromBlock.toString(),
        toBlock.toString(),
        address,
        lastPollId,
        offset
      );

      if (offset && logs.length === 0) {
        throw new Error(QUERY_OFFSET_REACHED_END);
      }

      return filterLogsByTopics(logs, topics);
    }

    throw new Error("invalid params!");
  }

  // Latest 500 transactions median gas_price
  async getMedianGasPrice(): Promise<bigint> {
    const sql = `SELECT (PERCENTILE_CONT(0.5) WITHIN GROUP(ORDER BY gas_price)) AS median FROM (SELECT gas_price FROM transactions ORDER BY id DESC LIMIT ?) AS gas_price;`;
    const result = await this.knex.raw(sql, [500]);

    const median = result.rows[0]?.median;
    if (median == null) {
      return BigInt(0);
    }

    return formatDecimal(median.toString());
  }
}

function formatBlock(block: Block): Block {
  return {
    ...block,
    number: BigInt(block.number),
    gas_limit: BigInt(block.gas_limit),
    gas_used: BigInt(block.gas_used),
    size: BigInt(block.size),
  };
}

function formatTransaction(tx: Transaction): Transaction {
  return {
    ...tx,
    id: BigInt(tx.id),
    block_number: BigInt(tx.block_number),
    transaction_index: +tx.transaction_index,
    value: BigInt(tx.value),
    nonce: toBigIntOpt(tx.nonce),
    gas_limit: toBigIntOpt(tx.gas_limit),
    gas_price: toBigIntOpt(tx.gas_price),
    v: BigInt(tx.v),
    cumulative_gas_used: toBigIntOpt(tx.cumulative_gas_used),
    gas_used: toBigIntOpt(tx.gas_used),
  };
}

function formatLog(log: Log): Log {
  return {
    ...log,
    id: BigInt(log.id),
    transaction_id: BigInt(log.transaction_id),
    transaction_index: +log.transaction_index,
    block_number: BigInt(log.block_number),
    log_index: +log.log_index,
  };
}

function formatErrorTransactionReceipt(
  e: ErrorTransactionReceipt
): ErrorTransactionReceipt {
  return {
    ...e,
    id: BigInt(e.id),
    block_number: BigInt(e.block_number),
    cumulative_gas_used: BigInt(e.cumulative_gas_used),
    gas_used: BigInt(e.gas_used),
    status_code: +e.status_code,
    status_reason: Buffer.from(e.status_reason).toString("utf-8"),
  };
}

function normalizeQueryAddress(address: HexString) {
  if (address && typeof address === "string") {
    return address.toLowerCase();
  }

  return address;
}

function normalizeLogQueryAddress(
  address: HexString | HexString[] | undefined
) {
  if (!address) {
    return address;
  }

  if (address && Array.isArray(address)) {
    return address.map((a) => normalizeQueryAddress(a));
  }

  return normalizeQueryAddress(address);
}

function toBigIntOpt(num: bigint | HexNumber | undefined): bigint | undefined {
  if (num == null) {
    return num as undefined;
  }

  return BigInt(num);
}

/*
  return a slice of log array which satisfy the topics matching.
  
  matching rule:

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
export function filterLogsByTopics(
  logs: Log[],
  filterTopics: FilterTopic[]
): Log[] {
  // match anything
  if (filterTopics.length === 0) {
    return logs;
  }
  if (filterTopics.every((t) => t === null)) {
    return logs;
  }

  let result: Log[] = [];
  for (let log of logs) {
    let topics = log.topics;
    let length = topics.length;
    let match = true;
    for (let i of [...Array(length).keys()]) {
      if (
        filterTopics[i] &&
        typeof filterTopics[i] === "string" &&
        topics[i] !== filterTopics[i]
      ) {
        match = false;
        break;
      }
      if (
        filterTopics[i] &&
        Array.isArray(filterTopics[i]) &&
        !filterTopics[i]?.includes(topics[i])
      ) {
        match = false;
        break;
      }
    }
    if (!match) {
      continue;
    }
    result.push(log);
  }
  return result;
}

export function filterLogsByAddress(
  logs: Log[],
  _address: HexString | undefined
): Log[] {
  const address = normalizeLogQueryAddress(_address);
  // match anything
  if (!address) {
    return logs;
  }

  let result: Log[] = [];
  for (let log of logs) {
    if (log.address === address) {
      result.push(log);
    }
  }
  return result;
}

export enum QueryRoundStatus {
  keepGoing,
  stop,
}

export interface ExecuteOneQueryResult {
  status: QueryRoundStatus;
  data: any[];
}

/**
 * limit the query in two constraints:  query number and query time
 * with N rounds of query, calculate the number and time
 * @param executeOneQuery query in one round
 * @returns
 */
export async function limitQuery(
  executeOneQuery: (offset: number) => Promise<ExecuteOneQueryResult>
) {
  const results = [];
  const t1 = new Date();
  for (const index of [...Array(MAX_QUERY_ROUNDS).keys()]) {
    const offset = index * MAX_QUERY_NUMBER;
    let executeResult = await executeOneQuery(offset);
    // console.log(`${index}th round =>`, executeResult.data.length, executeResult.status);
    results.push(...executeResult.data);

    // check if exceed max query number
    if (results.length > MAX_QUERY_NUMBER) {
      throw new LimitExceedError(
        `query returned more than ${MAX_QUERY_NUMBER} results`
      );
    }

    // check if exceed query timeout
    const t2 = new Date();
    const diffTimeMs = t2.getTime() - t1.getTime();
    if (diffTimeMs > MAX_QUERY_TIME_MILSECS) {
      throw new LimitExceedError(`query timeout exceeded`);
    }

    if (executeResult.status === QueryRoundStatus.stop) {
      // offset query reach end, break the loop
      break;
    }
  }
  return results;
}

export function buildQueryLogAddress(
  queryBuilder: KnexType.QueryBuilder,
  address: HexString | HexString[] | undefined
) {
  if (address && address.length !== 0) {
    const queryAddress = Array.isArray(address) ? [...address] : [address];
    queryBuilder.whereIn("address", queryAddress);
  }
}

// test
export function testTopicMatch() {
  const log: Log = {
    id: BigInt(0),
    transaction_hash: "",
    transaction_id: BigInt(0),
    transaction_index: 0,
    block_number: BigInt(0),
    block_hash: "",
    address: "",
    data: "",
    log_index: 0,
    topics: ["a", "b"],
  };

  const f0: FilterTopic[] = [null, null, null];
  const f1: FilterTopic[] = [];
  const f2: FilterTopic[] = ["a"];
  const f3: FilterTopic[] = [null, "b"];
  const f4: FilterTopic[] = ["a", "b"];
  const f5: FilterTopic[] = [
    ["a", "b"],
    ["a", "b"],
  ];

  console.log("f0 =>", filterLogsByTopics([log], f0));
  console.log("f1 =>", filterLogsByTopics([log], f1));
  console.log("f2 =>", filterLogsByTopics([log], f2));
  console.log("f3 =>", filterLogsByTopics([log], f3));
  console.log("f4 =>", filterLogsByTopics([log], f4));
  console.log("f5 =>", filterLogsByTopics([log], f5));
}
