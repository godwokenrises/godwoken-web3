"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const modules = __importStar(require("./modules"));
/**
 * get all methods. e.g., getBlockByNumber in eth module
 * @private
 * @param  {Object}   mod
 * @return {string[]}
 */
function getMethodNames(mod) {
    return Object.getOwnPropertyNames(mod.prototype);
}
/**
 * return all the methods in all module
 */
function getMethods() {
    const methods = {};
    modules.list.forEach((modName) => {
        const mod = new modules[modName]();
        getMethodNames(modules[modName])
            .filter((methodName) => methodName !== 'constructor')
            .forEach((methodName) => {
            const concatedMethodName = `${modName.toLowerCase()}_${methodName}`;
            methods[concatedMethodName] = mod[methodName].bind(mod);
        });
    });
    return methods;
}
const methods = getMethods();
console.log(methods);
module.exports = methods;
/**
module.exports = {

 
    web3_clientVersion : function (args: [], callback: Callback) {
        callback(null, getClientVersion()); // eg: "godwoken/v1.0/linux-amd64/rust1.47");
    },

    web3_sha3 : function (args: string[], callback: Callback) {
        try {
            const rawDigest = keccak(toBuffer(args[0]));
            const hexEncodedDigest = addHexPrefix(rawDigest.toString('hex'));
            callback(null, hexEncodedDigest);
          } catch (err) {
            console.log(err);
            callback(err);
        }
    },

    net_version : function (args: [], callback: Callback) {
       callback(null, Config.chain_id);
    },

    net_peerCount : function (args: [], callback: Callback) {
        callback(null, 0);
    },

    net_listening : function (args: [], callback: Callback) {
        callback(null, server.isListening() );
    },

    eth_protocolVersion : function (args: [], callback: Callback) {
        callback(null, Config.eth_protocolVersion);
    },

    eth_syncing : function (args: [], callback: Callback) {

    },
    
    eth_coinbase : function (args: [], callback: Callback) {

    },
    eth_mining : function (args: [], callback: Callback) {

    },
    eth_hashrate : function (args: [], callback: Callback) {

    },
    eth_gasPrice :  function (args: [], callback: Callback) {

    },
    eth_accounts : function (args: [], callback: Callback) {

    },
    eth_blockNumber : function (args: [], callback: Callback) {

    },
    eth_getBalance : function (args: [], callback: Callback) {

    },
}
*/
//# sourceMappingURL=index.js.map