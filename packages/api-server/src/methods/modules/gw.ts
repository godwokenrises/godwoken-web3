import { RPC } from "ckb-js-toolkit";
import { parseGwRpcError } from "../gw-error";
import { middleware } from "../validator";
import { Hash, HexNumber } from "@ckb-lumos/base";
import { HexU32 } from "@godwoken-web3/godwoken";

// TODO: use Redis
// import { Store } from "../../cache/store";
// import { envConfig } from "../../base/env-config";
// import { CACHE_EXPIRED_TIME_MILSECS } from "../../cache/constant";

export class Gw {
  private rpc: RPC;
  private scriptHashToAccountIdcache: Map<Hash, HexU32>;

  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);
    // this.cache = new Store(envConfig.redisUrl, true, CACHE_EXPIRED_TIME_MILSECS);
    // this.cahce.init();
    this.scriptHashToAccountIdcache = new Map();

    this.ping = middleware(this.ping.bind(this), 0);
    this.get_tip_block_hash = middleware(this.get_tip_block_hash.bind(this), 0);
    this.get_block_hash = middleware(this.get_block_hash.bind(this), 0);
    this.get_block = middleware(this.get_block.bind(this), 0);
    this.get_block_by_number = middleware(
      this.get_block_by_number.bind(this),
      0
    );
    this.get_balance = middleware(this.get_balance.bind(this), 0);
    this.get_storage_at = middleware(this.get_storage_at.bind(this), 0);
    this.get_account_id_by_script_hash = middleware(
      this.get_account_id_by_script_hash.bind(this),
      0
    );
    this.get_nonce = middleware(this.get_nonce.bind(this), 0);
    this.get_script = middleware(this.get_script.bind(this), 0);
    this.get_script_hash = middleware(this.get_script_hash.bind(this), 0);
    this.get_data = middleware(this.get_data.bind(this), 0);
    this.get_transaction_receipt = middleware(
      this.get_transaction_receipt.bind(this),
      0
    );
    this.get_transaction = middleware(this.get_transaction.bind(this), 0);
    this.execute_l2transaction = middleware(
      this.execute_l2transaction.bind(this),
      0
    );
    this.execute_raw_l2transaction = middleware(
      this.execute_raw_l2transaction.bind(this),
      0
    );
    this.submit_l2transaction = middleware(
      this.submit_l2transaction.bind(this),
      0
    );
    this.submit_withdrawal_request = middleware(
      this.submit_withdrawal_request.bind(this),
      0
    );
  }

  async ping(args: any[]) {
    try {
      const result = await this.rpc.gw_ping(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async get_tip_block_hash(args: any[]) {
    try {
      const result = await this.rpc.gw_get_tip_block_hash(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [block_number]
   * @returns
   */
  async get_block_hash(args: any[]) {
    try {
      args[0] = formatHexNumber(args[0]);

      const result = await this.rpc.gw_get_block_hash(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [block_hash]
   * @returns
   */
  async get_block(args: any[]) {
    try {
      const result = await this.rpc.gw_get_block(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [block_number]
   * @returns
   */
  async get_block_by_number(args: any[]) {
    try {
      args[0] = formatHexNumber(args[0]);

      const result = await this.rpc.gw_get_block_by_number(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [script_hash_160, sudt_id, (block_number)]
   * @returns
   */
  async get_balance(args: any[]) {
    try {
      args[1] = formatHexNumber(args[1]);
      args[2] = formatHexNumber(args[2]);

      const result = await this.rpc.gw_get_balance(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [account_id, key(Hash), (block_number)]
   * @returns
   */
  async get_storage_at(args: any[]) {
    try {
      args[0] = formatHexNumber(args[0]);
      args[2] = formatHexNumber(args[2]);

      const result = await this.rpc.gw_get_storage_at(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [script_hash]
   * @returns
   */
  async get_account_id_by_script_hash(args: any[]) {
    try {
      const scriptHash = args[0];
      let result = this.scriptHashToAccountIdcache.get(scriptHash);
      if (result !== undefined) {
        console.debug(`using cache: ${scriptHash} -> ${result}`);
        return result;
      }

      result = await this.rpc.gw_get_account_id_by_script_hash(...args);
      if (result) {
        console.debug(`update cache: ${scriptHash} -> ${result}`);
        this.scriptHashToAccountIdcache.set(scriptHash, result);
      }

      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [account_id, (block_number)]
   * @returns
   */
  async get_nonce(args: any[]) {
    try {
      args[0] = formatHexNumber(args[0]);
      args[1] = formatHexNumber(args[1]);

      const result = await this.rpc.gw_get_nonce(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [script_hash]
   * @returns
   */
  async get_script(args: any[]) {
    try {
      const result = await this.rpc.gw_get_script(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [account_id]
   * @returns
   */
  async get_script_hash(args: any[]) {
    try {
      args[0] = formatHexNumber(args[0]);

      const result = await this.rpc.gw_get_script_hash(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [data_hash, (block_number)]
   * @returns
   */
  async get_data(args: any[]) {
    try {
      args[1] = formatHexNumber(args[1]);

      const result = await this.rpc.gw_get_data(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [tx_hash]
   * @returns
   */
  async get_transaction_receipt(args: any[]) {
    try {
      const result = await this.rpc.gw_get_transaction_receipt(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [tx_hash, (verbose)]
   * @returns
   */
  async get_transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_get_transaction(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [l2tx(HexString)]
   * @returns
   */
  async execute_l2transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_execute_l2transaction(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [raw_l2tx(HexString), (block_number)]
   * @returns
   */
  async execute_raw_l2transaction(args: any[]) {
    try {
      args[1] = formatHexNumber(args[1]);

      const result = await this.rpc.gw_execute_raw_l2transaction(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [l2tx(HexString)]
   * @returns
   */
  async submit_l2transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_submit_l2transaction(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [withdrawal_request(HexString)]
   * @returns
   */
  async submit_withdrawal_request(args: any[]) {
    try {
      const result = await this.rpc.gw_submit_withdrawal_request(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [short_address]
   * @returns
   */
  async get_script_hash_by_short_address(args: any[]) {
    try {
      const result = await this.rpc.gw_get_script_hash_by_short_address(
        ...args
      );
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }
}

function formatHexNumber(
  num: HexNumber | undefined | null
): HexNumber | undefined | null {
  if (num == null) {
    return num;
  }

  return num.toLowerCase();
}
