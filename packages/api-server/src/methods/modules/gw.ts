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
}
