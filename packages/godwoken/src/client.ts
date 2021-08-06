import { Hash, HexNumber, HexString, Script } from "@ckb-lumos/base";
import { Reader, RPC } from "ckb-js-toolkit";
import {
  L2Transaction,
  RawL2Transaction,
  RunResult,
  U128,
  U32,
  U64,
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
    const hash = await this.rpc.gw_get_script_hash(accountId);
    return hash;
  }

  public async getAccountIdByScriptHash(
    scriptHash: Hash
  ): Promise<U32 | undefined> {
    const accountId: HexNumber =
      await this.rpc.gw_get_account_id_by_script_hash(scriptHash);
    return +accountId;
  }

  public async getScriptHashByShortAddress(
    shortAddress: HexString
  ): Promise<Hash | undefined> {
    const scriptHash: Hash | undefined =
      await this.rpc.gw_get_script_hash_by_short_address(shortAddress);
    return scriptHash;
  }

  public async getBalance(
    short_address: HexString,
    sudtId: U32,
    blockNumber?: U64
  ): Promise<U128> {
    const balance: HexNumber = await this.rpc.gw_get_balance(
      short_address,
      toHex(sudtId),
      toHex(blockNumber)
    );
    return BigInt(balance);
  }

  public async getStorageAt(
    accountId: U32,
    key: HexString,
    blockNumber?: U64
  ): Promise<Hash> {
    return await this.rpc.gw_get_storage_at(
      toHex(accountId),
      key,
      toHex(blockNumber)
    );
  }

  public async getScript(scriptHash: Hash): Promise<Script | undefined> {
    return await this.rpc.gw_get_script(scriptHash);
  }

  public async getNonce(accountId: U32, blockNumber?: U64): Promise<U32> {
    const nonce: HexNumber = await this.rpc.gw_get_nonce(
      toHex(accountId),
      toHex(blockNumber)
    );
    return +nonce;
  }

  public async getData(dataHash: Hash, blockNumber?: U64): Promise<HexString> {
    return await this.rpc.gw_get_data(dataHash, toHex(blockNumber));
  }

  public async executeRawL2Transaction(
    rawL2tx: RawL2Transaction,
    blockNumber?: U64
  ): Promise<RunResult> {
    const data: HexString = new Reader(
      SerializeRawL2Transaction(NormalizeRawL2Transaction(rawL2tx))
    ).serializeJson();
    return await this.rpc.gw_execute_raw_l2transaction(
      data,
      toHex(blockNumber)
    );
  }

  public async executeL2Transaction(l2tx: L2Transaction): Promise<RunResult> {
    const data: HexString = new Reader(
      SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await this.rpc.gw_execute_raw_l2transaction(data);
  }

  public async submitL2Transaction(l2tx: L2Transaction): Promise<Hash> {
    const data: HexString = new Reader(
      SerializeL2Transaction(NormalizeL2Transaction(l2tx))
    ).serializeJson();
    return await this.rpc.gw_submit_raw_l2transaction(data);
  }
}

function toHex(
  num: number | bigint | undefined | null
): HexNumber | undefined | null {
  if (num == null) {
    return num as undefined | null;
  }
  return "0x" + num.toString(16);
}
