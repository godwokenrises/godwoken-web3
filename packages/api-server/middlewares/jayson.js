const jayson = require('jayson');
const { methods, ethWalletMethods } = require('../lib/methods/index');

const server = jayson.server(methods);
const ethWalletServer = jayson.server(ethWalletMethods);

module.exports = function (req, res, next) {
  if (req.url.endsWith("/eth-wallet") && req.body.method.startsWith("eth_")) {
    return ethWalletServer.middleware()(req, res, next)
  }
  return server.middleware()(req, res, next)
}
