import { RPC } from "ckb-js-toolkit";
import { RpcError } from "../error";
import { GW_RPC_REQUEST_ERROR } from "../error-code";
import { middleware } from "../validator";
import abiCoder, { AbiCoder } from "web3-eth-abi";
import { LogItem } from "../types";
import { evmcCodeTypeMapping, parsePolyjuiceSystemLog } from "../gw-error";
import { FailedReason } from "../../base/types/api";

export class Gw {
  private rpc: RPC;
  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);

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
      parseError(error);
    }
  }

  async get_tip_block_hash(args: any[]) {
    try {
      const result = await this.rpc.gw_get_tip_block_hash(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_block_hash(args: any[]) {
    try {
      const result = await this.rpc.gw_get_block_hash(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_block(args: any[]) {
    try {
      const result = await this.rpc.gw_get_block(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_block_by_number(args: any[]) {
    try {
      const result = await this.rpc.gw_get_block_by_number(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_balance(args: any[]) {
    try {
      const result = await this.rpc.gw_get_balance(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_storage_at(args: any[]) {
    try {
      const result = await this.rpc.gw_get_storage_at(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_account_id_by_script_hash(args: any[]) {
    try {
      const result = await this.rpc.gw_get_account_id_by_script_hash(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_nonce(args: any[]) {
    try {
      const result = await this.rpc.gw_get_nonce(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_script(args: any[]) {
    try {
      const result = await this.rpc.gw_get_script(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_script_hash(args: any[]) {
    try {
      const result = await this.rpc.gw_get_script_hash(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_data(args: any[]) {
    try {
      const result = await this.rpc.gw_get_data(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_transaction_receipt(args: any[]) {
    try {
      const result = await this.rpc.gw_get_transaction_receipt(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_get_transaction(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async execute_l2transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_execute_l2transaction(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async execute_raw_l2transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_execute_raw_l2transaction(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async submit_l2transaction(args: any[]) {
    try {
      const result = await this.rpc.gw_submit_l2transaction(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async submit_withdrawal_request(args: any[]) {
    try {
      const result = await this.rpc.gw_submit_withdrawal_request(...args);
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async get_script_hash_by_short_address(args: any[]) {
    try {
      const result = await this.rpc.gw_get_script_hash_by_short_address(
        ...args
      );
      return result;
    } catch (error) {
      parseError(error);
    }
  }
}

function parseError(error: any): void {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);

    const last_log: LogItem | undefined = err.data?.last_log;
    if (last_log != null) {
      const polyjuiceSystemLog = parsePolyjuiceSystemLog(err.data.last_log);
      const abi = abiCoder as unknown as AbiCoder;
      const statusReason = abi.decodeParameter(
        "string",
        err.data.return_data.substring(10)
      ) as unknown as string;
      const failedReason: FailedReason = {
        status_code: "0x" + polyjuiceSystemLog.statusCode.toString(16),
        status_type:
          evmcCodeTypeMapping[polyjuiceSystemLog.statusCode.toString()],
        message: statusReason,
      };
      const data = { failed_reason: failedReason };
      const newMessage = `${failedReason.status_type.toLowerCase()}: ${
        failedReason.message
      }`;
      throw new RpcError(err.code, newMessage, data);
    }

    throw new RpcError(err.code, err.message);
  }

  // connection error
  if (message.startsWith("request to")) {
    throw new Error(message);
  }

  throw new RpcError(GW_RPC_REQUEST_ERROR, error.message);
}
