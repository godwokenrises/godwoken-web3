var jayson = require('jayson');

function eth_blockNumber(args, callback) {
    callback(null, "0x123")
}

var server = jayson.server({
    eth_blockNumber: eth_blockNumber
});

module.exports = server.middleware()
