// this file will store the `eth_address vs godwoken_short_addres` mapping in local level db.
// please query eth_address on chain first, if you cann't find it on chain,
// (in which case the account doesn't not exist on godwoken), then you should
// checkout here.

import levelup, { LevelUp } from 'levelup';
import leveldown from 'leveldown';
import path from 'path';
import { Script, utils } from '@ckb-lumos/base';

require('dotenv').config({ path: './.env' });
const ETH_ACCOUNT_LOCK_HASH = process.env.ETH_ACCOUNT_LOCK_HASH;
const ROLLUP_TYPE_HASH = process.env.ROLLUP_TYPE_HASH;

const STORE_PATH = path.resolve(__dirname, './hashmap-db');

export class HashMap {
  private db: LevelUp;

  constructor() {
    this.db = levelup(leveldown(STORE_PATH));
  }

  async save(gw_short_adddress: string, eth_address: string) {
    // before saving, should validate two address indeed match.
    const target_gw_short_address = ethAddressToScriptHash(eth_address).slice(
      0,
      42
    );
    console.log(eth_address, target_gw_short_address);
    if (target_gw_short_address !== gw_short_adddress)
      throw new Error(
        'eth_address and godwoken_short_address unmatched! abort saving!'
      );

    console.log(gw_short_adddress, eth_address);
    // use short-address as key, eth-address as value
    // note: we should keep lowercase and uppercase for eth_address since it will be used in checksum.
    await this.db.put(gw_short_adddress.toLowerCase(), eth_address);
  }

  async query(gw_short_address: string) {
    return await this.db.get(gw_short_address.toLowerCase(), {
      asBuffer: false
    });
  }
}

// hepler function
// todo: move to another file
function ethAddressToScriptHash(address: string) {
  const script: Script = {
    code_hash: ETH_ACCOUNT_LOCK_HASH as string,
    hash_type: 'type',
    args: ROLLUP_TYPE_HASH + address.slice(2)
  };
  const scriptHash = utils.computeScriptHash(script);
  return scriptHash;
}
