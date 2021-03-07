"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Web3 = void 0;
const util_1 = require("../../util");
const ethereumjs_util_1 = require("ethereumjs-util");
class Web3 {
    constructor() {
    }
    /**
     * Returns the current client version
     * @param  {Array<*>} [params] An empty array
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * client version as the second argument
     */
    clientVersion(args, callback) {
        callback(null, util_1.getClientVersion()); // eg: "godwoken/v1.0/linux-amd64/rust1.47"); 
    }
    /**
     * Returns Keccak-256 (not the standardized SHA3-256) of the given data
     * @param  {Array<string>} [params] The data to convert into a SHA3 hash
     * @param  {Function} [cb] A function with an error object as the first argument and the
     * Keccak-256 hash of the given data as the second argument
     */
    sha3(args, callback) {
        try {
            const rawDigest = ethereumjs_util_1.keccak(ethereumjs_util_1.toBuffer(args[0]));
            const hexEncodedDigest = ethereumjs_util_1.addHexPrefix(rawDigest.toString('hex'));
            callback(null, hexEncodedDigest);
        }
        catch (err) {
            console.log(err);
            callback(err);
        }
    }
}
exports.Web3 = Web3;
//# sourceMappingURL=web3.js.map