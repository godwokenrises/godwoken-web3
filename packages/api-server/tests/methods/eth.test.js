const test = require('ava');
const { client } = require('../client');
const EthConfig = require('../../config/eth.json');
const SimpleStorageCodeBin =
  '60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033';
test.cb('eth_protocolVersion', (t) => {
  client.request('eth_protocolVersion', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, EthConfig.eth_protocolVersion);
    t.end();
  });
});

test.cb('eth_coinbase', (t) => {
  client.request('eth_coinbase', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x' + '0'.repeat(40));
    t.end();
  });
});

test.cb('eth_mining', (t) => {
  client.request('eth_mining', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, false);
    t.end();
  });
});

test.cb('eth_hashrate', (t) => {
  client.request('eth_hashrate', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x0');
    t.end();
  });
});

test.cb('eth_accounts', (t) => {
  client.request('eth_accounts', [], function (err, response) {
    if (err) throw err;
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.cb('eth_getBlockByHash', (t) => {
  client.request(
    'eth_getBlockByHash',
    ['0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'
      );
      t.end();
    }
  );
});

test.cb('eth_getBlockByNumber', (t) => {
  client.request(
    'eth_getBlockByNumber',
    ['0xb71b00'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result.number, '0xb71b00');
      t.end();
    }
  );
});

test.cb('eth_getBlockTransactionCountByHash', (t) => {
  client.request(
    'eth_getBlockTransactionCountByHash',
    ['0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x107');
      t.end();
    }
  );
});

test.cb('eth_getBlockTransactionCountByNumber', (t) => {
  client.request(
    'eth_getBlockTransactionCountByNumber',
    ['0xb71b00'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x107');
      t.end();
    }
  );
});

test.cb('eth_getTransactionByBlockHashAndIndex', (t) => {
  client.request(
    'eth_getTransactionByBlockHashAndIndex',
    [
      '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b',
      '0x0'
    ],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionByBlockNumberAndIndex', (t) => {
  client.request(
    'eth_getTransactionByBlockNumberAndIndex',
    ['0xb71b00', '0x0'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionByHash', (t) => {
  client.request(
    'eth_getTransactionByHash',
    ['0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionReceipt', (t) => {
  client.request(
    'eth_getTransactionReceipt',
    ['0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.transactionHash,
        '0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce'
      );
      t.end();
    }
  );
});

/* #region filter-related test */
const filter = {
  address: '0x8290333ceF9e6D528dD5618Fb97a76f268f3EDD4',
  blockHash:
    '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x000000000000000000000000d551234ae421e3bcba99a0da6d736074f22192ff',
    '0x000000000000000000000000ef5bfdadbc3bd18bf19dbb0fb8571bc86b5a401f'
  ]
};
const filter_without_blockHash = {
  fromBlock: '0xb71aff',
  toBlock: 'latest',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000000000000000000000000000000000000000012d1'
  ]
};

const filter_with_pending = {
  fromBlock: 'pending',
  toBlock: 'pending',
  topics: [
    '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    '0x00000000000000000000000000000000000000000000000000000000000012d1'
  ]
};

var filter_id;

test.serial.cb('eth_newFilter', (t) => {
  client.request('eth_newFilter', [filter], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x1');
    filter_id = response.result;
    t.end();
  });
});

test.serial.cb('eth_getFilterLogs', (t) => {
  client.request(
    'eth_getFilterLogs',
    ['0x' + BigInt(filter_id).toString(16)],
    function (err, response) {
      if (err) throw err;
      t.is(response.result[0].blockHash, filter.blockHash);
      t.end();
    }
  );
});

test.serial.cb('eth_getFilterChanges', (t) => {
  client.request('eth_getFilterChanges', ['0x1'], function (err, response) {
    if (err) throw err;
    t.is(response.result[0].blockHash, filter.blockHash);
    t.end();
  });
});

test.serial.cb('eth_getFilterChanges_again', (t) => {
  client.request('eth_getFilterChanges', ['0x1'], function (err, response) {
    if (err) throw err;
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.serial.cb('eth_newBlockFilter', (t) => {
  client.request('eth_newBlockFilter', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x2');
    t.end();
  });
});

test.serial.cb('eth_getFilterLogs_for_newBlockFilter', (t) => {
  client.request('eth_getFilterLogs', ['0x2'], function (err, response) {
    if (err) throw err;
    t.is(
      response.result[0],
      '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'
    );
    t.end();
  });
});

test.serial.cb('eth_getFilterChanges_for_newBlockFilter', (t) => {
  client.request('eth_getFilterChanges', ['0x2'], function (err, response) {
    if (err) throw err;
    t.is(
      response.result[0],
      '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'
    );
    t.end();
  });
});

test.serial.cb('eth_getFilterChanges_again_for_newBlockFilter', (t) => {
  client.request('eth_getFilterChanges', ['0x2'], function (err, response) {
    if (err) throw err;
    // the test db only has one block and will never increase.
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.serial.cb('eth_newPendingTransactionFilter', (t) => {
  client.request(
    'eth_newPendingTransactionFilter',
    [],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x3');
      t.end();
    }
  );
});

test.serial.cb('eth_getFilterLogs_for_newPendingTransactionFilter', (t) => {
  client.request('eth_getFilterLogs', ['0x3'], function (err, response) {
    if (err) throw err;
    // newPendingTransactionFilter is currently not supported.
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.serial.cb('eth_getFilterChanges_for_newPendingTransactionFilter', (t) => {
  client.request('eth_getFilterChanges', ['0x3'], function (err, response) {
    if (err) throw err;
    // newPendingTransactionFilter is currently not supported.
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.serial.cb('eth_newFilter_without_BlockHash', (t) => {
  client.request(
    'eth_newFilter',
    [filter_without_blockHash],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x4');
      t.end();
    }
  );
});

test.serial.cb('eth_getFilterChanges_for_filterWithoutBlockHash', (t) => {
  client.request('eth_getFilterChanges', ['0x4'], function (err, response) {
    if (err) throw err;
    t.true(
      response.result[0].topics.includes(filter_without_blockHash.topics[0])
    );
    t.end();
  });
});

test.serial.cb('eth_getFilterChanges_again_for_filterWithoutBlockHash', (t) => {
  client.request('eth_getFilterChanges', ['0x4'], function (err, response) {
    if (err) throw err;
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.serial.cb('eth_getLogs_for_filterWithoutBlockHash', (t) => {
  client.request(
    'eth_getLogs',
    [filter_without_blockHash],
    function (err, response) {
      if (err) throw err;
      t.true(
        response.result[0].topics.includes(filter_without_blockHash.topics[0]))
});
  

test.cb('eth_coinbase', (t) => {
  client.request('eth_coinbase', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x' + '0'.repeat(40));
    t.end();
  });
});

test.cb('eth_mining', (t) => {
  client.request('eth_mining', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, false);
    t.end();
  });
});

test.cb('eth_hashrate', (t) => {
  client.request('eth_hashrate', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0x0');
    t.end();
  });
});

test.cb('eth_accounts', (t) => {
  client.request('eth_accounts', [], function (err, response) {
    if (err) throw err;
    t.deepEqual(response.result, []);
    t.end();
  });
});

test.cb('eth_getBlockByHash', (t) => {
  client.request(
    'eth_getBlockByHash',
    ['0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'
      );
      t.end();
    }
  );
});

test.serial.cb('eth_getLogs_for_filterWithPending', (t) => {
  client.request(
    'eth_getLogs',
    [filter_with_pending],
    function (err, response) {
      if (err) throw err;
      t.deepEqual(response.result, []);
test.cb('eth_getBlockByNumber', (t) => {
  client.request(
    'eth_getBlockByNumber',
    ['0xb71b00'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result.number, '0xb71b00');
      t.end();
    }
  );
});

test.serial.cb('eth_uninstallFilter', (t) => {
  client.request('eth_uninstallFilter', ['0x2'], function (err, response) {
    if (err) throw err;
    t.true(response.result);
test.cb('eth_getBlockTransactionCountByHash', (t) => {
  client.request(
    'eth_getBlockTransactionCountByHash',
    ['0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x107');
      t.end();
    }
  );
});

test.cb('eth_getBlockTransactionCountByNumber', (t) => {
  client.request(
    'eth_getBlockTransactionCountByNumber',
    ['0xb71b00'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, '0x107');
      t.end();
    }
  );
});

test.cb('eth_getTransactionByBlockHashAndIndex', (t) => {
  client.request(
    'eth_getTransactionByBlockHashAndIndex',
    [
      '0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b',
      '0x0'
    ],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionByBlockNumberAndIndex', (t) => {
  client.request(
    'eth_getTransactionByBlockNumberAndIndex',
    ['0xb71b00', '0x0'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionByHash', (t) => {
  client.request(
    'eth_getTransactionByHash',
    ['0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.hash,
        '0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc'
      );
      t.end();
    }
  );
});

test.cb('eth_getTransactionReceipt', (t) => {
  client.request(
    'eth_getTransactionReceipt',
    ['0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce'],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result.transactionHash,
        '0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce'
      );
      t.end();
    }
  );
});

test.cb('eth_syncing', (t) => {
  client.request('eth_syncing', [], function (err, response) {
    if (err) throw err;
    t.is(response.result.currentBlock, '0xb71b00');
    t.end();
  });
});

test.serial.cb('eth_getFilterLogs_for_newBlockFilter_after_uninstall', (t) => {
  client.request('eth_getFilterLogs', ['0x2'], function (err, response) {
    if (err) throw err;
    t.deepEqual(response.result, []);
test.cb('eth_blockNumber', (t) => {
  client.request('eth_blockNumber', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '0xb71b00');
    t.end();
  });
});

// if you want to test the below cache-test case,
// remember to change the filter's TTL(cache time, default is 5 minutes)
// to a much shorter one (like 3000 milseconds) for convience.
//
// test.serial.cb('eth_filter_cache', t => {
//     setTimeout(() => {
//         client.request(
//             "eth_getFilterLogs",
//             ['0x4'],
//             function (err, response) {
//               if (err) throw err;
//               t.deepEqual(response.result, []);
//               t.end();
//             }
//         )
//     }, 6000);
// });

/* #endregion */
// test.cb('eth_getStorageAt', (t) => {
//   client.request(
//     'eth_getStorageAt',
//     ['0x010000000200000002000000', '0x0', 'latest'],
//     function (err, response) {
//       if (err) throw err;
//       t.is(response.result, '');
//       t.end();
//     }
//   );
// });

test.cb('eth_getCode', (t) => {
  client.request(
    'eth_getCode',
    ['0x010000000200000002000000', 'latest'],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, SimpleStorageCodeBin);
      t.end();
    }
  );
});

// test.cb('eth_getTransactionCount', (t) => {
//   client.request(
//     'eth_getTransactionCount',
//     ['0x3db4a5310fe102430eb457c257e695795985fd73', 'latest'],
//     function (err, response) {
//       if (err) throw err;
//       t.is(response.result, '');
//       t.end();
//     }
//   );
// });

// test.cb('eth_getBalance', (t) => {
//   client.request(
//     'eth_getBalance',
//     ['0x3db4a5310fe102430eb457c257e695795985fd73', 'latest'],
//     function (err, response) {
//       if (err) throw err;
//       t.is(response.result, '');
//       t.end();
//     }
//   );
// });

test.cb('eth_call', (t) => {
  client.request(
    'eth_call',
    [
      '0x3db4a5310fe102430eb457c257e695795985fd73',
      '0x010000000200000002000000',
      '0x' + BigInt(21000),
      '0x' + BigInt(1).toString(16),
      '0x0',
      // '0x60fe47b10000000000000000000000000000000000000000000000000000000000000002',
      '0x6d4ce63c',
      'latest'
    ],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result,
        '0x000000000000000000000000000000000000000000000000000000000000007b'
      );
      t.end();
    }
  );
});
