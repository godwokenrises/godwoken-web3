const test = require('ava');
const { client } = require('../client');

test.cb('web3_clientVersion' , t => {
    client.request('web3_clientVersion', [], function(err, response) {
        if(err) throw err;
        t.is(response.result.substring(0, 15), 'Godwoken/v1.0.0');
        t.end();
    });
});

test.cb('web3_sha3' , t => {
    client.request('web3_sha3', ['0x0012'], function(err, response) {
        if(err) throw err;
        t.is(response.result, '0x677034980f47f6cb0a55e7d8674ba838c39165afe34da2fc538f695d4950b38e');
        t.end();
    });
});

  
  
  