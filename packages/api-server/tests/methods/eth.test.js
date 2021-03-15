const test = require('ava');
const { client } = require('../client');
const EthConfig = require('../../config/eth.json');

test.cb('eth_protocolVersion' , t => {
    client.request('eth_protocolVersion', [], function(err, response) {
        if(err) throw err;
        t.is(response.result, EthConfig.eth_protocolVersion);
        t.end();
    });
});

test.cb('eth_coinbase' , t => {
    client.request('eth_coinbase', [], function(err, response) {
        if(err) throw err;
        t.is( response.result, '0x' + '0'.repeat(40) );
        t.end(); 
    });
});

test.cb('eth_mining' , t => {
    client.request('eth_mining', [], function(err, response) {
        if(err) throw err;
        t.is(response.result, false);
        t.end();
    });
});

test.cb('eth_hashrate' , t => {
    client.request('eth_hashrate', [], function(err, response) {
        if(err) throw err;
        t.is(response.result, '0x0');
        t.end();
    });
});

test.cb('eth_accounts' , t => {
    client.request('eth_accounts', [], function(err, response) {
        if(err) throw err;
        t.deepEqual(response.result, []);
        t.end();
    });
});







  
