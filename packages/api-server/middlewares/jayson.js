var jayson = require('jayson');
var methods = require('../lib/methods/index');

var server = jayson.server(methods);

module.exports = server.middleware()
