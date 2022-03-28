import { HexNumber } from "@ckb-lumos/base";
import { gwConfig } from "../../base/gw-config";
const server = require("../../../bin/www");

export class Net {
  constructor() {}

  /**
   * Returns the current net version
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * net version as the second argument
   */
  version(_args: []): HexNumber {
    return gwConfig.web3ChainId!;
  }

  /**
   * Returns the current peer nodes number, which is always 0 since godwoken is not emplementing p2p network
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * current peer nodes number as the second argument
   */
  peerCount(_args: []): HexNumber {
    return "0x0";
  }

  /**
   * Returns if the client is currently listening
   * @param  {Array<*>} [params] An empty array
   * @param  {Function} [cb] A function with an error object as the first argument and the
   * boolean as the second argument
   */
  listening(_args: []): boolean {
    return server.isListening();
  }
}
