const jayson = require('jayson');
const test = require('ava');

const PORT = process.env.PORT || '3000';

// create a client
const client = jayson.client.http({
  port: PORT
});

test('create client', t => {
    t.is(client.options.port, PORT);
});

module.exports = { client };

/*
// invoke "methods"

client.request('net_version', [], function(err, response) {
    if(err) throw err;
    console.log(`net_version: ${response.result}`);
});

client.request('net_peerCount', [], function(err, response) {
    if(err) throw err;
    console.log(`net_peerCount: ${response.result}`);
});

client.request('net_listening', [], function(err, response) {
    if(err) throw err;
    console.log(`net_listening: ${response.result}`);
});

client.request('eth_protocolVersion', [], function(err, response) {
    if(err) throw err;
    console.log(`eth_protocolVersion: ${response.result}`);
});

client.request('eth_coinbase', [], function(err, response) {
    if(err) throw err;
    console.log(`eth_coinbase: ${response.result}`);
});

client.request('eth_mining', [], function(err, response) {
    if(err) throw err;
    console.log(`eth_mining: ${response.result}`);
});

client.request('eth_hashrate', [], function(err, response) {
    if(err) throw err;
    console.log(`eth_hashrate: ${response.result}`);
});


client.request('eth_accounts', [], function(err, response) {
    if(err) throw err;
    console.log(`eth_accounts: ${response.result}`);
});
/*

client.request('eth_syncing', [], function(err, response) {
    if(err) throw err;
    console.log(response); // 2
});
*/