const jayson = require("jayson");

const PORT = process.env.PORT || "3000";

// create a client
const client = jayson.client.http({
  port: PORT,
});

// invoke "methods"

// invoke "methods"
client.request("web3_clientVersion", [], function (err, response) {
  if (err) throw err;
  console.log(`web3_clientVersion: ${response.result}`); // 2
});

client.request("web3_sha3", ["0x0012"], function (err, response) {
  if (err) throw err;
  console.log(`web3_sha3: ${response.result}`); // 2
});

client.request("net_version", [], function (err, response) {
  if (err) throw err;
  console.log(`net_version: ${response.result}`);
});

client.request("net_peerCount", [], function (err, response) {
  if (err) throw err;
  console.log(`net_peerCount: ${response.result}`);
});

client.request("net_listening", [], function (err, response) {
  if (err) throw err;
  console.log(`net_listening: ${response.result}`);
});

client.request("eth_protocolVersion", [], function (err, response) {
  if (err) throw err;
  console.log(`eth_protocolVersion: ${response.result}`);
});

client.request("eth_coinbase", [], function (err, response) {
  if (err) throw err;
  console.log(`eth_coinbase: ${response.result}`);
});

client.request("eth_mining", [], function (err, response) {
  if (err) throw err;
  console.log(`eth_mining: ${response.result}`);
});

client.request("eth_hashrate", [], function (err, response) {
  if (err) throw err;
  console.log(`eth_hashrate: ${response.result}`);
});

client.request("eth_accounts", [], function (err, response) {
  if (err) throw err;
  console.log(`eth_accounts: ${response.result}`);
});

client.request(
  "eth_getBlockByHash",
  ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b"],
  function (err, response) {
    if (err) throw err;
    console.log(`eth_getBlockByHash: ${response.result.hash}`);
  }
);

client.request("eth_getBlockByNumber", ["0xb71b00"], function (err, response) {
  if (err) throw err;
  console.log(`eth_getBlockNumber: ${response.result.number}`);
});

client.request(
  "eth_getBlockTransactionCountByHash",
  ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b"],
  function (err, response) {
    if (err) throw err;
    console.log(`eth_getBlockTransactionCountByHash: ${response.result}`);
  }
);

client.request(
  "eth_getBlockTransactionCountByNumber",
  ["0xb71b00"],
  function (err, response) {
    if (err) throw err;
    console.log(`eth_getBlockTransactionCountByNumber: ${response.result}`);
  }
);

client.request(
  "eth_getTransactionByBlockHashAndIndex",
  ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b", "0x0"],
  function (err, response) {
    if (err) throw err;
    console.log(
      `eht_getTransactionByBlockHashAndIndex: ${response.result.hash}`
    );
  }
);

client.request(
  "eth_getTransactionByBlockNumberAndIndex",
  ["0xb71b00", "0x0"],
  function (err, response) {
    if (err) throw err;
    console.log(
      `eth_getTransactionByBlockNumberAndIndex: ${response.result.hash}`
    );
  }
);

client.request(
  "eth_getTransactionByHash",
  ["0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc"],
  function (err, response) {
    if (err) throw err;
    console.log(`eth_getTransactionByHash: ${response.result.hash}`);
  }
);

client.request(
  "eth_getTransactionReceipt",
  ["0x51d129664282ee9f05a1ec3982cb915f89f9d0577be0702ec1b31297921397ce"],
  function (err, response) {
    if (err) throw err;
    console.log(
      `eth_getTransactionReceipt: ${response.result.transactionHash}`
    );
  }
);

/*

client.request('eth_syncing', [], function(err, response) {
    if(err) throw err;
    console.log(response); // 2
});
*/
