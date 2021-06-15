import {
  ethAddressToPolyjuiceAddress,
  polyjuiceAddressToEthAddress
} from '../../convert-tx';
import { RPC } from 'ckb-js-toolkit';
import { Callback } from '../types';
import { middleware, validators } from '../validator';
export class Poly {
  private rpc: RPC;

  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);

    this.ethAddressToPolyjuiceAddress = middleware(
      this.ethAddressToPolyjuiceAddress.bind(this),
      1,
      [validators.address]
    );

    this.polyjuiceAddressToEthAddress = middleware(
      this.polyjuiceAddressToEthAddress.bind(this),
      1,
      [validators.address]
    );

    this.get_eth_address_by_godwoken_short_address = middleware(
      this.get_eth_address_by_godwoken_short_address.bind(this),
      1,
      [validators.address]
    );

    this.save_eth_address_godwoken_short_address_mapping = middleware(
      this.save_eth_address_godwoken_short_address_mapping.bind(this),
      2,
      [validators.address, validators.address]
    );
  }

  async ethAddressToPolyjuiceAddress(args: [string], callback: Callback) {
    const ethAddress = args[0];
    const polyjuiceAddress = await ethAddressToPolyjuiceAddress(
      ethAddress,
      this.rpc
    );
    callback(null, polyjuiceAddress);
  }

  async polyjuiceAddressToEthAddress(args: [string], callback: Callback) {
    const polyjuiceAddress = args[0];
    const ethAddress = await polyjuiceAddressToEthAddress(
      polyjuiceAddress,
      this.rpc
    );
    callback(null, ethAddress);
  }

  async get_eth_address_by_godwoken_short_address(
    args: [string],
    callback: Callback
  ) {
    // todo: not impl yet
    callback(null, null);
  }

  async save_eth_address_godwoken_short_address_mapping(
    args: [string],
    callback: Callback
  ) {
    // todo: not impl yet
    callback(null, null);
  }
}
