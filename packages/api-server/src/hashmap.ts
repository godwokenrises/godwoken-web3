// this file will store the `eth_address vs godwoken_short_addres` mapping in local level db.
// please query eth_address on chain first, if you cann't find it on chain,
// (in which case the account doesn't not exist on godwoken), then you should
// checkout here.

import levelup, { LevelUp } from 'levelup';
import leveldown from 'leveldown';
import path from 'path';

const STORE_PATH = path.resolve(__dirname, './hash-map-db');

export class HashMap {
  private db: LevelUp;

  constructor() {
    this.db = levelup(leveldown(STORE_PATH));
  }

  async save(gw_short_adddress: string, eth_address: string) {
    // use short-address as key, eth-address as value
    await this.db.put(gw_short_adddress, eth_address);
  }

  async query(gw_short_address: string) {
    return await this.db.get(gw_short_address);
  }
}
