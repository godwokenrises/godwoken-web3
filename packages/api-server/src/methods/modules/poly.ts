import {
  ethAddressToPolyjuiceAddress,
  polyjuiceAddressToEthAddress
} from '../../convert-tx';
import { RPC } from 'ckb-js-toolkit';
import { Callback } from '../types';
import { middleware, validators } from '../validator';
import { HashMap } from '../../hashmap';
import { INTERNAL_ERROR, INVALID_PARAMS } from '../error-code';

export class Poly {
  private rpc: RPC;
  private hashMap: HashMap;

  constructor() {
    this.rpc = new RPC(process.env.GODWOKEN_JSON_RPC as string);
    this.hashMap = new HashMap();

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

  async getEthAddressByGodwokenShortAddress(
    args: [string],
    callback: Callback
  ) {
    try {
      const gw_short_adddress = args[0];
      const eth_addrss = await this.hashMap.query(gw_short_adddress);
      callback(null, eth_addrss);
    } catch (error) {
      console.log(error);
      if (error.notFound) {
        return callback({
          code: INVALID_PARAMS,
          message: 'gw_short_address as key is not found on database.'
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
      await this.hashMap.save(godwoken_short_address, eth_address);
      callback(
        null,
        `insert one record, [${eth_address}]: ${godwoken_short_address}`
      );
    } catch (error) {
      callback({ code: INVALID_PARAMS, message: error.message }, null);
    }
  }
}
