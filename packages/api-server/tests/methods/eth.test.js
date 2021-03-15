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


test.cb('eth_getBlockByHash', t => {
    client.request(
        "eth_getBlockByHash",
        ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result.hash, "0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b");
          t.end();
        }
    );
});

test.cb('eth_getBlockByNumber', t => {
    client.request("eth_getBlockByNumber", ["0xb71b00"], function (err, response) {
        if (err) throw err;
        t.is(response.result.number, "0xb71b00");
        t.end(); 
    });
});

test.cb('eth_getBlockTransactionCountByHash', t => {
    client.request(
        "eth_getBlockTransactionCountByHash",
        ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result, '0x107');
          t.end();
        }
    );
});

test.cb('eth_getBlockTransactionCountByNumber', t => {
    client.request(
        "eth_getBlockTransactionCountByNumber",
        ["0xb71b00"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result, '0x107');
          t.end();  
        }
    );
});

test.cb('eth_getTransactionByBlockHashAndIndex', t => {
    client.request(
        "eth_getTransactionByBlockHashAndIndex",
        ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b", "0x0"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result.hash, '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc');
          t.end();  
        }
    );
});

test.cb('eth_getTransactionByBlockNumberAndIndex', t => {
    client.request(
        "eth_getTransactionByBlockNumberAndIndex",
        ["0xb71b00", "0x0"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result.hash, '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc');
          t.end();  
        }
    );
})
  
test.cb('eth_getTransactionByHash', t => {
    client.request(
        "eth_getTransactionByHash",
        ["0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result.hash, "0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc");
          t.end(); 
        }
    );
});

test.cb('eth_getTransactionReceipt', t => {
    client.request(
        "eth_getTransactionReceipt",
        ["0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce"],
        function (err, response) {
          if (err) throw err;
          t.is(response.result.transactionHash, "0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce");
          t.end(); 
        }
    );    
});

