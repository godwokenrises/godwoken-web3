import { parseGwRpcError } from "../gw-error";
import { RPC } from "@godwoken-web3/godwoken";
import { middleware, verifyGasPrice } from "../validator";
import { HexNumber } from "@ckb-lumos/base";
import { Store } from "../../cache/store";
import { envConfig } from "../../base/env-config";
import { CACHE_EXPIRED_TIME_MILSECS, GW_RPC_KEY } from "../../cache/constant";
import { logger } from "../../base/logger";
import { L2Transaction } from "@godwoken-web3/godwoken/schemas";
import { Reader } from "@ckb-lumos/toolkit";
import { decodeArgs } from "../../base/decode-args";

export class Gw {
  private rpc: RPC;
  private readonlyRpc: RPC;
  private gwCache: Store;

  constructor() {
    this.rpc = new RPC(envConfig.godwokenJsonRpc);
    this.readonlyRpc = !!envConfig.godwokenReadonlyJsonRpc
      ? new RPC(envConfig.godwokenReadonlyJsonRpc)
      : this.rpc;

    this.gwCache = new Store(
      envConfig.redisUrl,
      true,
      CACHE_EXPIRED_TIME_MILSECS
    );
    this.gwCache.init();

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
    this.get_last_submitted_info = middleware(
      this.get_last_submitted_info.bind(this),
      0
    );
  }

  async ping(args: any[]) {
    try {
      const result = await this.readonlyRpc.gw_ping(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async get_tip_block_hash(args: any[]) {
    try {
      const result = await this.readonlyRpc.gw_get_tip_block_hash(...args);
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

      const result = await this.readonlyRpc.gw_get_block_hash(...args);
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
      const result = await this.readonlyRpc.gw_get_block(...args);
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

      const result = await this.readonlyRpc.gw_get_block_by_number(...args);
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

      const result = await this.readonlyRpc.gw_get_balance(...args);
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

      const result = await this.readonlyRpc.gw_get_storage_at(...args);
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
      let result = await this.gwCache.get(`${GW_RPC_KEY}_${scriptHash}`);
      if (result != null) {
        logger.debug(`using cache: ${scriptHash} -> ${result}`);
        return result;
      }

      result = await this.readonlyRpc.gw_get_account_id_by_script_hash(...args);
      if (result != null) {
        logger.debug(`update cache: ${scriptHash} -> ${result}`);
        this.gwCache.insert(`${GW_RPC_KEY}_${scriptHash}`, result);
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
      const result = await this.readonlyRpc.gw_get_script(...args);
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

      const result = await this.readonlyRpc.gw_get_script_hash(...args);
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

      const result = await this.readonlyRpc.gw_get_data(...args);
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
      const result = await this.readonlyRpc.gw_get_transaction_receipt(...args);
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
      const result = await this.readonlyRpc.gw_get_transaction(...args);
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
      const result = await this.readonlyRpc.gw_execute_l2transaction(...args);
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

      const result = await this.readonlyRpc.gw_execute_raw_l2transaction(
        ...args
      );
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
      // validate minimal gas price
      const l2Tx = new L2Transaction(new Reader(args[0]));
      const polyArgs = new Reader(
        l2Tx.getRaw().getArgs().raw()
      ).serializeJson();
      const { gas_price } = decodeArgs(polyArgs);
      verifyGasPrice(gas_price === "0x" ? "0x0" : gas_price, 0);

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
      const shortAddress = args[0];
      const key = `${GW_RPC_KEY}_addr_${shortAddress}`;
      const value = await this.gwCache.get(key);
      if (value != null) {
        logger.debug(
          `using cache : shortAddress(${shortAddress}) -> scriptHash(${value})`
        );
        return value;
      }

      const result = await this.readonlyRpc.gw_get_script_hash_by_short_address(
        ...args
      );
      if (result != null) {
        logger.debug(
          `update cache: shortAddress(${shortAddress}) -> scriptHash(${result})`
        );
        this.gwCache.insert(key, result);
      }
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args []
   * @returns
   */
  async get_fee_config(args: any[]) {
    try {
      const result = await this.readonlyRpc.gw_get_fee_config(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  /**
   *
   * @param args [withdraw_tx_hash]
   * @returns
   */
  async get_withdrawal(args: any[]) {
    try {
      const result = await this.readonlyRpc.gw_get_withdrawal(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async get_last_submitted_info(args: any[]) {
    try {
      const result = await this.rpc.gw_get_last_submitted_info(...args);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async get_mem_pool_state_root(args: any[]) {
    try {
      const result = await this.readonlyRpc.gw_get_mem_pool_state_root(...args);
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
