const test = require('ava');
const { client } = require('../client');

test.cb('poly_saveEthAddressGodwokenShortAddressMapping', (t) => {
  client.request(
    'poly_saveEthAddressGodwokenShortAddressMapping',
    [
      '0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A',
      '0x0000000000000000000000000000000000000000'
    ],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result,
        'insert one record, [0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A]: 0x0000000000000000000000000000000000000000'
      );
      t.end();
    }
  );
});

test.cb('poly_getEthAddressByGodwokenShortAddress', (t) => {
  client.request(
    'poly_getEthAddressByGodwokenShortAddress',
    ['0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x0000000000000000000000000000000000000000');
      t.end();
    }
  );
});

test.cb('poly_getEthAddressByGodwokenShortAddress with key not exist', (t) => {
  client.request(
    'poly_getEthAddressByGodwokenShortAddress',
    ['0x768249aC5ED64517C96c16e26B7A5Aa3E9334217'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, undefined);
      t.end();
    }
  );
});
