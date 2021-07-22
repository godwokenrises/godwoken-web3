import { RPC } from "ckb-js-toolkit";
import { GW_RPC_REQUEST_ERROR } from "../error-code";
import { Callback } from "../types";
import { middleware } from "../validator";

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

  async ping(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_ping(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_tip_block_hash(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_tip_block_hash(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_block_hash(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_block_hash(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_block(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_block(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_block_by_number(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_block_by_number(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_balance(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_balance(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_storage_at(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_storage_at(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_account_id_by_script_hash(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_account_id_by_script_hash(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_nonce(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_nonce(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_script(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_script(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_script_hash(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_script_hash(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_data(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_data(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_transaction_receipt(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_transaction_receipt(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async execute_l2transaction(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_execute_l2transaction(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async execute_raw_l2transaction(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_execute_raw_l2transaction(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async submit_l2transaction(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_submit_l2transaction(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async submit_withdrawal_request(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_submit_withdrawal_request(...args);
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }

  async get_script_hash_by_short_address(args: any[], callback: Callback) {
    try {
      const result = await this.rpc.gw_get_script_hash_by_short_address(
        ...args
      );
      callback(null, result);
    } catch (error) {
      callback(parseError(error));
    }
  }
}

function parseError(error: any): { code: number; message: string } {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);
    return {
      code: err.code,
      message: err.message,
    };
  }

  return {
    code: GW_RPC_REQUEST_ERROR,
    message: error.message,
  };
}
