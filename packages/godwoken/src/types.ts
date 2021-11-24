import { Hash, HexNumber, HexString } from "@ckb-lumos/base";

export type U32 = number;
export type U64 = bigint;
export type U128 = bigint;

export type HexU32 = HexNumber;
export type HexU64 = HexNumber;
export type HexU128 = HexNumber;

// null means `pending`
export type BlockParameter = U64 | null;

/**
 * HashMap<fee_sudt_id, fee_rate>
 * fee_rate is known as gasPrice in Ethereum.
 */
interface FeeRates {
  readonly [sudtId: string]: HexU64;
}
/**
 * e.g. {"fee_rates":{"0x1":"0x1f4"},...}
 */
export interface FeeConfig {
  fee_rates: FeeRates;
}

export interface LogItem {
  account_id: HexU32;
  // The actual type is `u8`
  service_flag: HexU32;
  data: HexString;
}

export interface RunResult {
  return_data: HexString;
  logs: LogItem[];
}

export interface RawL2Transaction {
  from_id: HexU32;
  to_id: HexU32;
  nonce: HexU32;
  args: HexString;
}

export interface L2Transaction {
  raw: RawL2Transaction;
  signature: HexString;
}

export interface L2TransactionWithStatus {
  transaction: L2Transaction;
  tx_status: {
    status: "committed" | "pending";
    block_hash?: Hash;
  };
}

export interface L2TransactionReceipt {
  tx_witness_hash: Hash;
  post_state: AccountMerkleState;
  read_data_hashes: Hash[];
  logs: LogItem[];
}

export interface AccountMerkleState {
  merkle_root: Hash;
  count: HexU32;
}
