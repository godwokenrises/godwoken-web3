const jayson = require('jayson');

const PORT = process.env.PORT || '3000';

// create a client
const client = jayson.client.http({
  port: PORT
});

// invoke "methods"

// invoke "methods"
client.request('web3_clientVersion', [], function(err, response) {
  if(err) throw err;
  console.log(`web3_clientVersion: ${response.result}`); // 2
});

client.request('web3_sha3', ['0x0012'], function(err, response) {
    if(err) throw err;
    console.log(`web3_sha3: ${response.result}`); // 2
});

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