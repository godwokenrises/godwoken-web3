import { Hash, HexNumber, HexString, Script } from "@ckb-lumos/base";
import { Reader, RPC } from "ckb-js-toolkit";
import {
  BlockParameter,
  L2Transaction,
  L2TransactionReceipt,
  L2TransactionWithStatus,
  RawL2Transaction,
  RunResult,
  U128,
  U32,
  FeeConfig,
} from "./types";
import { SerializeL2Transaction, SerializeRawL2Transaction } from "../schemas";
import {
  NormalizeL2Transaction,
  NormalizeRawL2Transaction,
} from "./normalizers";

export class GodwokenClient {
  private rpc: RPC;

  constructor(url: string) {
    this.rpc = new RPC(url);
  }

  public async getScriptHash(accountId: U32): Promise<Hash | undefined> {
    const hash = await this.rpcCall("get_script_hash", toHex(accountId));
    return hash;
  }

  public async getAccountIdByScriptHash(
    scriptHash: Hash
  ): Promise<U32 | undefined> {
    const accountId: HexNumber = await this.rpcCall(
      "get_account_id_by_script_hash",
      scriptHash
    );
    return +accountId;
  }

  public async getScriptHashByShortAddress(
    shortAddress: HexString
  ): Promise<Hash | undefined> {
    const scriptHash: Hash | undefined = await this.rpcCall(
      "get_script_hash_by_short_address",
      shortAddress
    );
    return scriptHash;
  }

  public async getBalance(
    short_address: HexString,
    sudtId: U32,
    blockParameter?: BlockParameter
  ): Promise<U128> {
    const balance: HexNumber = await this.rpcCall(
      "get_balance",
      short_address,
      toHex(sudtId),
      toHex(blockParameter)
    );
    return BigInt(balance);
  }

  public async getStorageAt(
    accountId: U32,
    key: HexString,
    blockParameter?: BlockParameter
  ): Promise<Hash> {
    return await this.rpcCall(
      "get_storage_at",
      toHex(accountId),
      key,
      toHex(blockParameter)
    );
  }

  public async getScript(scriptHash: Hash): Promise<Script | undefined> {
    return await this.rpcCall("get_script", scriptHash);
  }

  public async getNonce(
    accountId: U32,
    blockParameter?: BlockParameter
  ): Promise<U32> {
    const nonce: HexNumber = await this.rpcCall(
      "get_nonce",
      toHex(accountId),
      toHex(blockParameter)
    );
    return +nonce;
  }

  /**
   * getFeeConfig from Godwoken RPC
   */
  public async getFeeConfig(): Promise<FeeConfig> {
    // TODO: cache FeeConfig
    return this.rpcCall("get_fee_config");
  }

  public async getData(
    dataHash: Hash,
    blockParameter?: BlockParameter
  ): Promise<HexString> {
    return await this.rpcCall("get_data", dataHash, toHex(blockParameter));
  }

  public async executeRawL2Transaction(
    rawL2tx: RawL2Transaction,
    blockParameter?: BlockParameter
  ): Promise<RunResult> {
    const data: HexString = new Reader(
      SerializeRawL2Transaction(NormalizeRawL2Transaction(rawL2tx))
    ).serializeJson();
    return await this.rpcCall(
      "execute_raw_l2transaction",
      data,
      toHex(blockParameter)
    );
  }

  public async executeL2Transaction(l2tx: L2Transaction): Promise<RunResult> {
    const data: HexString = new Reader(
      SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await this.rpcCall("execute_l2transaction", data);
  }

  public async submitL2Transaction(l2tx: L2Transaction): Promise<Hash> {
    const data: HexString = new Reader(
      SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await this.rpcCall("submit_l2transaction", data);
  }

  public async getTransaction(
    hash: Hash
  ): Promise<L2TransactionWithStatus | undefined> {
    return await this.rpcCall("get_transaction", hash);
  }

  public async getTransactionReceipt(
    hash: Hash
  ): Promise<L2TransactionReceipt | undefined> {
    return await this.rpcCall("get_transaction_receipt", hash);
  }

  private async rpcCall(methodName: string, ...args: any[]): Promise<any> {
    const name = "gw_" + methodName;
    try {
      const result = await this.rpc[name](...args);
      return result;
    } catch (err) {
      console.log(`Call gw rpc "${name}" error:`, err.message);
      throw err;
    }
  }
}

function toHex(num: number | bigint | undefined | null): HexNumber | undefined {
  if (num == null) {
    return undefined;
  }
  return "0x" + num.toString(16);
}
