import { Knex as KnexType } from "knex";
import { HexString } from "@ckb-lumos/base";
import { Account } from "./types";
import { ethAddressToShortScriptHash } from "../base/address";

const ACCOUNTS_TABLE_NAME = "accounts";

export class AccountsQuery {
  private knex: KnexType;

  constructor(knex: KnexType) {
    this.knex = knex;
  }

  // One saved, content will not update except set account_id if null before.
  async save(ethAddress: HexString, shortScriptHash?: HexString) {
    if (shortScriptHash == null) {
      shortScriptHash = ethAddressToShortScriptHash(ethAddress);
    }

    await this.knex<DbAccount>(ACCOUNTS_TABLE_NAME)
      .insert({
        eth_address: toBuffer(ethAddress),
        gw_short_script_hash: toBuffer(shortScriptHash),
      })
      .onConflict("eth_address")
      .ignore();
  }

  async getByEthAddress(ethAddress: HexString): Promise<Account | undefined> {
    return await this.get({
      eth_address: toBuffer(ethAddress),
    });
  }

  async getByShortScriptHash(
    shortScriptHash: HexString
  ): Promise<Account | undefined> {
    return await this.get({
      gw_short_script_hash: toBuffer(shortScriptHash),
    });
  }

  async exists(
    ethAddress: HexString,
    shortScriptHash: HexString
  ): Promise<boolean> {
    const result = await this.knex<DbAccount>(ACCOUNTS_TABLE_NAME)
      .where("eth_address", toBuffer(ethAddress))
      .orWhere("gw_short_script_hash", toBuffer(shortScriptHash))
      .first();
    return result != null;
  }

  private async get(
    params: Readonly<Partial<KnexType.MaybeRawRecord<DbAccount>>>
  ): Promise<Account | undefined> {
    const result = await this.knex<DbAccount>(ACCOUNTS_TABLE_NAME)
      .where(params)
      .first();

    if (result == null) {
      return undefined;
    }
    return toAccount(result);
  }
}

interface DbAccount {
  id: number;
  eth_address: Buffer;
  gw_short_script_hash: Buffer;
}

function toAccount(db: DbAccount): Account {
  return {
    eth_address: toHex(db.eth_address),
    gw_short_script_hash: toHex(db.gw_short_script_hash),
  };
}

function toBuffer(hex: HexString): Buffer {
  return Buffer.from(hex.slice(2), "hex");
}

function toHex(buf: Buffer): HexString {
  return "0x" + buf.toString("hex");
}
