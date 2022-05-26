import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import {
  Block,
  Transaction,
  Log,
  DBBlock,
  DBTransaction,
  DBLog,
} from "./types";
import Knex, { Knex as KnexType } from "knex";
import { LogQueryOption } from "./types";
import { envConfig } from "../base/env-config";
import { MAX_QUERY_NUMBER } from "./constant";
import { QUERY_OFFSET_REACHED_END } from "../methods/constant";
import {
  formatDecimal,
  toBigIntOpt,
  formatBlock,
  formatTransaction,
  formatLog,
  buildQueryLogAddress,
  normalizeLogQueryAddress,
  filterLogsByTopics,
  bufferToHex,
  hexToBuffer,
} from "./helpers";

const poolMax = envConfig.pgPoolMax || 20;
const GLOBAL_KNEX = Knex({
  client: "postgresql",
  connection: {
    connectionString: envConfig.databaseUrl,
    keepAlive: true,
  },
  pool: { min: 2, max: +poolMax },
});

export class Query {
  private knex: KnexType;

  constructor() {
    this.knex = GLOBAL_KNEX;
  }

  async getTipBlockNumber(): Promise<bigint | undefined> {
    const blockData = await this.knex<DBBlock>("blocks")
      .select("number")
      .orderBy("number", "desc")
      .first();

    return toBigIntOpt(blockData?.number);
  }

  async getTipBlock(): Promise<Block | undefined> {
    const block = await this.knex<DBBlock>("blocks")
      .orderBy("number", "desc")
      .first();

    if (!block) {
      return undefined;
    }
    return formatBlock(block);
  }

  async getBlockByHash(blockHash: Hash): Promise<Block | undefined> {
    return await this.getBlock({
      hash: hexToBuffer(blockHash),
    });
  }

  async getBlockByNumber(blockNumber: bigint): Promise<Block | undefined> {
    return await this.getBlock({
      number: blockNumber.toString(),
    });
  }

  private async getBlock(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DBBlock>>>
  ): Promise<Block | undefined> {
    const block = await this.knex<DBBlock>("blocks").where(params).first();

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
    const blocks = await this.knex<DBBlock>("blocks")
      .where("number", ">", minBlockNumber.toString())
      .andWhere("number", "<=", maxBlockNumber.toString())
      .orderBy("number", "asc");
    return blocks.map((block) => formatBlock(block));
  }

  async getBlocksAfterBlockNumber(
    number: bigint,
    order: "desc" | "asc" = "desc"
  ): Promise<Block[]> {
    const blocks = await this.knex<DBBlock>("blocks")
      .where("number", ">", number.toString())
      .orderBy("number", order);
    return blocks.map((block) => formatBlock(block));
  }

  async getTransactionsByBlockHash(blockHash: Hash): Promise<Transaction[]> {
    return await this.getTransactions({ block_hash: hexToBuffer(blockHash) });
  }

  async getTransactionsByBlockNumber(
    blockNumber: bigint
  ): Promise<Transaction[]> {
    return await this.getTransactions({ block_number: blockNumber.toString() });
  }

  private async getTransactions(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DBTransaction>>>
  ): Promise<Transaction[]> {
    const transactions = await this.knex<DBTransaction>("transactions").where(
      params
    );

    return transactions.map((tx) => formatTransaction(tx));
  }

  async getTransactionByHash(hash: Hash): Promise<Transaction | undefined> {
    return await this.getTransaction({
      hash: hexToBuffer(hash),
    });
  }

  async getTransactionByEthTxHash(
    eth_tx_hash: Hash
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      eth_tx_hash: hexToBuffer(eth_tx_hash),
    });
  }

  async getTransactionByBlockHashAndIndex(
    blockHash: Hash,
    index: number
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      block_hash: hexToBuffer(blockHash),
      transaction_index: index,
    });
  }

  async getTransactionByBlockNumberAndIndex(
    blockNumber: bigint,
    index: number
  ): Promise<Transaction | undefined> {
    return await this.getTransaction({
      block_number: blockNumber.toString(),
      transaction_index: index,
    });
  }

  private async getTransaction(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DBTransaction>>>
  ): Promise<Transaction | undefined> {
    const transaction = await this.knex<DBTransaction>("transactions")
      .where(params)
      .first();

    if (transaction == null) {
      return undefined;
    }

    return formatTransaction(transaction);
  }

  async getTransactionHashesByBlockHash(blockHash: Hash): Promise<Hash[]> {
    return await this.getTransactionHashes({
      block_hash: hexToBuffer(blockHash),
    });
  }

  async getTransactionHashesByBlockNumber(
    blockNumber: bigint
  ): Promise<Hash[]> {
    return await this.getTransactionHashes({
      block_number: blockNumber.toString(),
    });
  }

  private async getTransactionHashes(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DBTransaction>>>
  ): Promise<Hash[]> {
    const transactionHashes = await this.knex<DBTransaction>("transactions")
      .select("hash")
      .where(params);

    return transactionHashes.map((tx) => bufferToHex(tx.hash));
  }

  async getTransactionEthHashesByBlockHash(blockHash: Hash): Promise<Hash[]> {
    return await this.getTransactionEthHashes({
      block_hash: hexToBuffer(blockHash),
    });
  }

  async getTransactionEthHashesByBlockNumber(
    blockNumber: bigint
  ): Promise<Hash[]> {
    return await this.getTransactionEthHashes({
      block_number: blockNumber.toString(),
    });
  }

  private async getTransactionEthHashes(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DBTransaction>>>
  ): Promise<Hash[]> {
    const transactionHashes = await this.knex<DBTransaction>("transactions")
      .select("eth_tx_hash")
      .where(params);

    return transactionHashes.map((tx) => bufferToHex(tx.eth_tx_hash));
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
    const data = await this.knex<DBTransaction>("transactions")
      .where(params)
      .count();

    const count: number = +data[0].count;

    return count;
  }

  async getTransactionAndLogsByHash(
    txHash: Hash
  ): Promise<[Transaction, Log[]] | undefined> {
    const tx = await this.knex<DBTransaction>("transactions")
      .where({ hash: hexToBuffer(txHash) })
      .first();

    if (!tx) {
      return undefined;
    }

    const logs = await this.knex<DBLog>("logs").where({
      transaction_hash: hexToBuffer(txHash),
    });

    return [formatTransaction(tx), logs.map((log) => formatLog(log))];
  }

  async getTipLog() {
    let log = await this.knex<DBLog>("logs").orderBy("id", "desc").first();
    if (log != null) {
      return formatLog(log);
    }
    return null;
  }

  private async queryLogsByBlockHash(
    blockHash: HexString,
    address?: HexString | HexString[],
    lastPollId?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const queryLastPollId = lastPollId || -1;
    const queryOffset = offset || 0;
    let logs: DBLog[] = await this.knex<DBLog>("logs")
      .modify(buildQueryLogAddress, address)
      .where("block_hash", blockHash)
      .where("id", ">", queryLastPollId.toString(10))
      .orderBy("id", "asc")
      .offset(queryOffset)
      .limit(MAX_QUERY_NUMBER);
    return logs.map((log) => formatLog(log));
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
    let logs: DBLog[] = await this.knex<DBLog>("logs")
      .modify(buildQueryLogAddress, address)
      .where("block_number", ">=", fromBlock)
      .where("block_number", "<=", toBlock)
      .where("id", ">", queryLastPollId.toString(10))
      .orderBy("id", "asc")
      .offset(queryOffset)
      .limit(MAX_QUERY_NUMBER);
    return logs.map((log) => formatLog(log));
  }

  async getLogs(
    option: LogQueryOption,
    blockHashOrFromBlock: HexString | bigint,
    toBlock?: bigint,
    offset?: number
  ): Promise<Log[]> {
    const address = normalizeLogQueryAddress(option.address);
    const topics = option.topics || [];

    if (typeof blockHashOrFromBlock === "string" && toBlock == null) {
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

    if (typeof blockHashOrFromBlock === "bigint" && toBlock != null) {
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

    if (typeof blockHashOrFromBlock === "string" && toBlock == null) {
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

    if (typeof blockHashOrFromBlock === "bigint" && toBlock != null) {
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
