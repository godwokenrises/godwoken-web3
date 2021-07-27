import { Hash, HexNumber } from "@ckb-lumos/base";
import { Block, Transaction, Log } from "./types";
import Knex, { Knex as KnexType } from "knex";

export class Query {
  private knex: KnexType;

  constructor(databaseUrl: string) {
    this.knex = Knex({
      client: "postgresql",
      connection: databaseUrl,
    });
  }

  async getTipBlockNumber(): Promise<bigint | undefined> {
    const blockData = await this.knex<Block>("blocks")
      .select("number")
      .orderBy("number", "desc")
      .first();

    return toBigIntOpt(blockData?.number);
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

    return transaction;
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

function toBigIntOpt(num: bigint | HexNumber | undefined): bigint | undefined {
  if (num == null) {
    return num as undefined;
  }

  return BigInt(num);
}
