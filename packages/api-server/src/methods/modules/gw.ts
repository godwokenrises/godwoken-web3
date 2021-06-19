import { RPC } from 'ckb-js-toolkit';
import { Callback } from '../types';
import { middleware } from '../validator';

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
    const result = await this.rpc.ping(...args);
    callback(null, result);
  }

  async get_tip_block_hash(args: any[], callback: Callback) {
    const result = await this.rpc.get_tip_block_hash(...args);
    callback(null, result);
  }

  async get_block_hash(args: any[], callback: Callback) {
    const result = await this.rpc.get_block_hash(...args);
    callback(null, result);
  }

  async get_block(args: any[], callback: Callback) {
    const result = await this.rpc.get_block(...args);
    callback(null, result);
  }

  async get_block_by_number(args: any[], callback: Callback) {
    const result = await this.rpc.get_block_by_number(...args);
    callback(null, result);
  }

  async get_balance(args: any[], callback: Callback) {
    const result = await this.rpc.get_balance(...args);
    callback(null, result);
  }

  async get_storage_at(args: any[], callback: Callback) {
    const result = await this.rpc.get_storage_at(...args);
    callback(null, result);
  }

  async get_account_id_by_script_hash(args: any[], callback: Callback) {
    console.log(args)
    const result = await this.rpc.get_account_id_by_script_hash(...args);
    callback(null, result);
  }

  async get_nonce(args: any[], callback: Callback) {
    const result = await this.rpc.get_nonce(...args);
    callback(null, result);
  }

  async get_script(args: any[], callback: Callback) {
    const result = await this.rpc.get_script(...args);
    callback(null, result);
  }

  async get_script_hash(args: any[], callback: Callback) {
    console.log(args);
    const result = await this.rpc.get_script_hash(...args);
    callback(null, result);
  }

  async get_data(args: any[], callback: Callback) {
    const result = await this.rpc.get_data(...args);
    callback(null, result);
  }

  async get_transaction_receipt(args: any[], callback: Callback) {
    const result = await this.rpc.get_transaction_receipt(...args);
    callback(null, result);
  }

  async execute_l2transaction(args: any[], callback: Callback) {
    const result = await this.rpc.execute_l2transaction(...args);
    callback(null, result);
  }

  async execute_raw_l2transaction(args: any[], callback: Callback) {
    const result = await this.rpc.execute_raw_l2transaction(...args);
    callback(null, result);
  }

  async submit_l2transaction(args: any[], callback: Callback) {
    console.log('submit_l2transaction...');
    console.log(args);
    const result = await this.rpc.submit_l2transaction(...args);
    callback(null, result);
  }

  async submit_withdrawal_request(args: any[], callback: Callback) {
    const result = await this.rpc.submit_withdrawal_request(...args);
    callback(null, result);
  }

  async get_script_hash_by_short_address(args: any[], callback: Callback) {
    const result = await this.rpc.get_script_hash_by_short_address(...args);
    callback(null, result);
  }
}
