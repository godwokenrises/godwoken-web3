import { Hash, HexString } from "@ckb-lumos/base";
import {
  EthBlock,
  EthLog,
  EthNewHead,
  EthTransaction,
  EthTransactionReceipt,
} from "../base/types/api";
import { Uint64, Uint32, Uint128, toHexNumber } from "../base/types/uint";
import { FilterTopic } from "../cache/types";
import {
  POLY_BLOCK_DIFFICULTY,
  POLY_MAX_BLOCK_GAS_LIMIT,
} from "../methods/constant";

export interface Account {
  eth_address: HexString;
  gw_short_script_hash: HexString;
}

export interface Block {
  number: bigint;
  hash: Hash;
  parent_hash: Hash;
  logs_bloom: HexString;
  gas_limit: bigint;
  gas_used: bigint;
  timestamp: Date;
  miner: HexString;
  size: bigint;
}

export interface Transaction {
  id: bigint;
  hash: Hash;
  eth_tx_hash: Hash;
  block_number: bigint;
  block_hash: Hash;
  transaction_index: number;
  from_address: HexString;
  to_address?: HexString;
  value: bigint;
  nonce?: bigint;
  gas_limit?: bigint;
  gas_price?: bigint;
  input?: HexString;
  v: bigint;
  r: HexString;
  s: HexString;
  cumulative_gas_used?: bigint;
  gas_used?: bigint;
  logs_bloom: HexString;
  contract_address?: HexString;
  status: boolean;
}

export interface Log {
  id: bigint;
  transaction_id: bigint;
  transaction_hash: Hash;
  transaction_index: number;
  block_number: bigint;
  block_hash: Hash;
  address: HexString;
  data: HexString;
  log_index: number;
  topics: HexString[];
}

export function toApiBlock(
  b: Block,
  transactions: (EthTransaction | Hash)[] = []
): EthBlock {
  const gasLimit =
    b.gas_limit === 0n
      ? new Uint64(BigInt(POLY_MAX_BLOCK_GAS_LIMIT)).toHex()
      : new Uint64(b.gas_limit).toHex();

  return {
    number: new Uint64(b.number).toHex(),
    hash: b.hash,
    parentHash: b.parent_hash,
    gasLimit,
    gasUsed: new Uint128(b.gas_used).toHex(),
    miner: b.miner,
    size: new Uint64(b.size).toHex(),
    logsBloom: transformLogsBloom(b.logs_bloom),
    transactions,
    timestamp: new Uint64(BigInt(b.timestamp.getTime() / 1000)).toHex(),
    mixHash: EMPTY_HASH,
    nonce: "0x" + "00".repeat(8),
    stateRoot: EMPTY_HASH,
    sha3Uncles: EMPTY_HASH,
    receiptsRoot: EMPTY_HASH,
    transactionsRoot: EMPTY_HASH,
    uncles: [],
    difficulty: toHexNumber(POLY_BLOCK_DIFFICULTY),
    totalDifficulty: toHexNumber(POLY_BLOCK_DIFFICULTY),
    extraData: "0x",
  };
}

export function toApiTransaction(t: Transaction): EthTransaction {
  return {
    hash: t.eth_tx_hash,
    blockHash: t.block_hash,
    blockNumber: new Uint64(t.block_number).toHex(),
    transactionIndex: new Uint32(t.transaction_index).toHex(),
    from: t.from_address,
    to: t.to_address || null,
    gas: new Uint64(t.gas_limit || 0n).toHex(), // TODO: check default value
    gasPrice: new Uint128(t.gas_price || 0n).toHex(), // TODO: check default value
    input: t.input || "0x", // TODO: check default value
    nonce: new Uint64(t.nonce || 0n).toHex(), // TODO: check default value
    value: new Uint128(t.value).toHex(),
    v: new Uint64(t.v).toHex(),
    r: t.r,
    s: t.s,
  };
}

export function toApiTransactionReceipt(
  t: Transaction,
  logs: EthLog[] = []
): EthTransactionReceipt {
  return {
    transactionHash: t.eth_tx_hash,
    blockHash: t.block_hash,
    blockNumber: new Uint64(t.block_number).toHex(),
    transactionIndex: new Uint32(t.transaction_index).toHex(),
    gasUsed: new Uint128(t.gas_used || 0n).toHex(), // TODO: check default value
    cumulativeGasUsed: new Uint128(t.cumulative_gas_used || 0n).toHex(), // TODO: check default value
    logsBloom: transformLogsBloom(t.logs_bloom),
    logs,
    contractAddress: t.contract_address || null,
    status: t.status ? "0x1" : "0x0",
    from: t.from_address,
    to: t.to_address || null,
  };
}

export function errorReceiptToApiTransaction(
  t: ErrorTransactionReceipt,
  blockHash: HexString,
  ethTxHash: HexString
): EthTransaction {
  return {
    hash: ethTxHash,
    blockHash,
    blockNumber: new Uint64(t.block_number).toHex(),
    transactionIndex: "0x0", // dummy
    from: "0x" + "00".repeat(20), // dummy
    to: null, // dummy
    gas: "0x" + t.gas_used.toString(16),
    gasPrice: "0x1", // dummy
    input: "0x", // dummy
    nonce: "0x0", // dummy
    value: "0x0", // dummy
    v: "0x0", // dummy
    r: "0x" + "00".repeat(32), // dummy
    s: "0x" + "00".repeat(32), // dummy
  };
}

export function errorReceiptToApiTransactionReceipt(
  e: ErrorTransactionReceipt,
  blockHash: HexString,
  ethTxHash: HexString
): EthTransactionReceipt {
  return {
    transactionHash: ethTxHash,
    blockHash,
    blockNumber: new Uint64(e.block_number).toHex(),
    transactionIndex: "0x0", // dummy
    gasUsed: "0x" + e.gas_used.toString(16),
    cumulativeGasUsed: "0x" + e.cumulative_gas_used.toString(16),
    logsBloom: transformLogsBloom("0x"),
    logs: [],
    contractAddress: null, // dummy
    status: "0x0", // 0 means failed
    from: "0x" + "00".repeat(20), // dummy
    to: null, // dummy
  };
}

export function toApiLog(l: Log, ethTxHash: HexString): EthLog {
  const data = l.data === "0x" ? "0x" + "00".repeat(32) : l.data;
  return {
    address: l.address,
    blockHash: l.block_hash,
    blockNumber: new Uint64(l.block_number).toHex(),
    transactionIndex: new Uint32(l.transaction_index).toHex(),
    transactionHash: ethTxHash,
    data,
    logIndex: new Uint32(l.log_index).toHex(),
    topics: l.topics,
    removed: false,
  };
}

export function toApiNewHead(b: Block): EthNewHead {
  const gasLimit =
    b.gas_limit === 0n
      ? new Uint64(BigInt(POLY_MAX_BLOCK_GAS_LIMIT)).toHex()
      : new Uint64(b.gas_limit).toHex();

  return {
    number: new Uint64(b.number).toHex(),
    hash: b.hash,
    parentHash: b.parent_hash,
    gasLimit,
    gasUsed: new Uint128(b.gas_used).toHex(),
    miner: b.miner,
    logsBloom: transformLogsBloom(b.logs_bloom),
    timestamp: new Uint64(BigInt(b.timestamp.getTime() / 1000)).toHex(),
    mixHash: EMPTY_HASH,
    nonce: "0x" + "00".repeat(8),
    stateRoot: EMPTY_HASH,
    sha3Uncles: EMPTY_HASH,
    receiptsRoot: EMPTY_HASH,
    transactionsRoot: EMPTY_HASH,
    difficulty: toHexNumber(POLY_BLOCK_DIFFICULTY),
    extraData: "0x",
    baseFeePerGas: "0x0",
  };
}

const EMPTY_HASH = "0x" + "00".repeat(32);

const DEFAULT_LOGS_BLOOM = "0x" + "00".repeat(256);
function transformLogsBloom(bloom: HexString) {
  if (!bloom || bloom === "0x") {
    return DEFAULT_LOGS_BLOOM;
  }
  return bloom;
}

export type LogQueryOption = {
  address?: HexString;
  topics?: FilterTopic[];
};

export interface ErrorTransactionReceipt {
  id: bigint;
  hash: Hash;
  block_number: bigint;
  cumulative_gas_used: bigint;
  gas_used: bigint;
  status_code: number;
  status_reason: string;
}
