import { Callback } from '../types';
import { getClientVersion } from '../../util';
import { addHexPrefix, keccak, toBuffer } from 'ethereumjs-util';
import { middleware, validators } from '../validator';

export class Web3 {
  constructor() {
    this.sha3 = middleware(this.sha3.bind(this), 1, [validators.hex]);
  }

  /**
   * Returns the current client version
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * client version as the second argument
   */
  clientVersion(args: [], callback: Callback) {
    callback(null, getClientVersion()); // eg: "godwoken/v1.0/linux-amd64/rust1.47");
  }

  /**
   * Returns Keccak-256 (not the standardized SHA3-256) of the given data
   * @param  {Array<string>} [params] The data to convert into a SHA3 hash
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * Keccak-256 hash of the given data as the second argument
   */
  sha3(args: string[], callback: Callback) {
    try {
      const rawDigest = keccak(toBuffer(args[0]));
      const hexEncodedDigest = addHexPrefix(rawDigest.toString('hex'));
      callback(null, hexEncodedDigest);
    } catch (err) {
      console.log(err);
      callback(err);
    }
  }
}
