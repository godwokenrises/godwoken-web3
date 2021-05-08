import { RPC } from 'ckb-js-toolkit';
import {
  ethAddressToGodwokenAddress,
  godwokenAddressToEthAddress
} from '../../convert-tx';
import { Callback } from '../types';
import { middleware, validators } from '../validator';

export class Gw {
  private rpc: RPC;

  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);

    this.ethAddressToGodwokenAddress = middleware(
      this.ethAddressToGodwokenAddress.bind(this),
      1,
      [validators.address]
    );

    this.godwokenAddressToEthAddress = middleware(
      this.godwokenAddressToEthAddress.bind(this),
      1,
      [validators.address]
    );
  }

  async ethAddressToGodwokenAddress(args: [string], callback: Callback) {
    const ethAddress = args[0];
    const godwokenAddress = await ethAddressToGodwokenAddress(
      ethAddress,
      this.rpc
    );
    callback(null, godwokenAddress);
  }

  async godwokenAddressToEthAddress(args: [string], callback: Callback) {
    const godwokenAddress = args[0];
    const ethAddress = await godwokenAddressToEthAddress(
      godwokenAddress,
      this.rpc
    );
    callback(null, ethAddress);
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

  async execute_l2tranaction(args: any[], callback: Callback) {
    const result = await this.rpc.execute_l2transaction(...args);
    callback(null, result);
  }

  async execute_raw_l2transaction(args: any[], callback: Callback) {
    const result = await this.rpc.execute_raw_l2transaction(...args);
    callback(null, result);
  }

  async submit_l2transaction(args: any[], callback: Callback) {
    const result = await this.rpc.submit_l2transaction(...args);
    callback(null, result);
  }

  async submit_withdrawal_request(args: any[], callback: Callback) {
    const result = await this.rpc.submit_withdrawal_request(...args);
    callback(null, result);
  }
}
