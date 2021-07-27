import { RPC } from "ckb-js-toolkit";
import { Callback } from "../types";
import { middleware, validators } from "../validator";
import { HashMap } from "../../hashmap";
import { INTERNAL_ERROR, INVALID_PARAMS, WEB3_ERROR } from "../error-code";
require("dotenv").config({ path: "./.env" });

export class Poly {
  private rpc: RPC;
  private hashMap: HashMap;

  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);
    this.hashMap = new HashMap();

    this.getEthAddressByGodwokenShortAddress = middleware(
      this.getEthAddressByGodwokenShortAddress.bind(this),
      1,
      [validators.address]
    );

    this.saveEthAddressGodwokenShortAddressMapping = middleware(
      this.saveEthAddressGodwokenShortAddressMapping.bind(this),
      2,
      [validators.address, validators.address]
    );
  }

  async getEthAddressByGodwokenShortAddress(
    args: [string],
    callback: Callback
  ) {
    try {
      const gw_short_adddress = args[0];
      const eth_addrss = await this.hashMap.query(gw_short_adddress);
      console.log(
        `[from hash_map] eth address: ${eth_addrss}, short_address: ${gw_short_adddress}`
      );
      callback(null, eth_addrss);
    } catch (error) {
      console.log(error);
      if (error.notFound) {
        return callback({
          code: INVALID_PARAMS,
          message: "gw_short_address as key is not found on database.",
        });
      }

      return callback({ code: INTERNAL_ERROR, message: error.message });
    }
  }

  async saveEthAddressGodwokenShortAddressMapping(
    args: [string, string],
    callback: Callback
  ) {
    try {
      const eth_address = args[0];
      const godwoken_short_address = args[1];
      // todo: save before check if it not exsit;
      await this.hashMap.save(godwoken_short_address, eth_address);
      console.log(
        `poly_hashmap: insert one record, [${godwoken_short_address}]: ${eth_address}`
      );
      callback(null, `ok`);
    } catch (error) {
      console.log(error);
      callback({ code: INVALID_PARAMS, message: error.message }, null);
    }
  }

  async getCreatorId(args: [], callback: Callback) {
    try {
      const creator_id_hex =
        "0x" + BigInt(process.env.CREATOR_ACCOUNT_ID!).toString(16);
      callback(null, creator_id_hex);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }

  // from in eth_call is optional, DEFAULT_FROM_ADDRESS fills it when empty
  async getDefaultFromAddress(args: [], callback: Callback) {
    callback(null, process.env.DEFAULT_FROM_ADDRESS);
  }

  async getContractValidatorTypeHash(args: [], callback: Callback) {
    if (process.env.POLYJUICE_VALIDATOR_TYPE_HASH)
      callback(null, process.env.POLYJUICE_VALIDATOR_TYPE_HASH!);
    else
      callback({
        code: WEB3_ERROR,
        message: "POLYJUICE_VALIDATOR_TYPE_HASH not found!",
      });
  }

  async getRollupTypeHash(args: [], callback: Callback) {
    if (process.env.ROLLUP_TYPE_HASH)
      callback(null, process.env.ROLLUP_TYPE_HASH!);
    else
      callback({
        code: WEB3_ERROR,
        message: "ROLLUP_TYPE_HASH not found!",
      });
  }

  async getRollupConfigHash(args: [], callback: Callback) {
    if (process.env.ROLLUP_TYPE_HASH)
      callback(null, process.env.ROLLUP_CONFIG_HASH!);
    else
      callback({
        code: WEB3_ERROR,
        message: "ROLLUP_CONFIG_HASH not found!",
      });
  }

  async getEthAccountLockHash(args: [], callback: Callback) {
    if (process.env.ETH_ACCOUNT_LOCK_HASH)
      callback(null, process.env.ETH_ACCOUNT_LOCK_HASH!);
    else
      callback({
        code: WEB3_ERROR,
        message: "ETH_ACCOUNT_LOCK_HASH not found!",
      });
  }

  async getChainInfo(args: [], callback: Callback) {
    try {
      const chainInfo = {
        rollupScriptHash: process.env.ROLLUP_TYPE_HASH,
        rollupConfigHash: process.env.ROLLUP_CONFIG_HASH,
        ethAccountLockTypeHash: process.env.ETH_ACCOUNT_LOCK_HASH,
        polyjuiceContractTypeHash: process.env.POLYJUICE_VALIDATOR_TYPE_HASH,
        polyjuiceCreatorId: process.env.CREATOR_ACCOUNT_ID,
        chainId: process.env.CHAIN_ID,
      };
      callback(null, chainInfo);
    } catch (error) {
      callback({
        code: WEB3_ERROR,
        message: error.message,
      });
    }
  }
}
