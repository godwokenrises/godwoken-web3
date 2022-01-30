const test = require("ava");
const { client } = require("../client");

test.cb("poly_saveEthAddressGodwokenShortScriptHashMapping", (t) => {
  client.request(
    "poly_saveEthAddressGodwokenShortScriptHashMapping",
    [
      "0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A",
      "0x6934bca347369e4e9f1d6e88facb22271c7d32bb",
    ],
    function (err, response) {
      if (err) throw err;
      t.is(
        response.result,
        "insert one record, [0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A]: 0x6934bca347369e4e9f1d6e88facb22271c7d32bb"
      );
      t.end();
    }
  );
});

test.cb("poly_getEthAddressByGodwokenShortScriptHash", (t) => {
  client.request(
    "poly_getEthAddressByGodwokenShortScriptHash",
    ["0x6934bca347369e4e9f1d6e88facb22271c7d32bb"],
    function (err, response) {
      if (err) throw err;
      t.is(response.result, "0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A");
      t.end();
    }
  );
});

test.cb(
  "poly_getEthAddressByGodwokenShortScriptHash-with-key-not-exist",
  (t) => {
    client.request(
      "poly_getEthAddressByGodwokenShortScriptHash",
      ["0x768249aC5ED64517C96c16e26B7A5Aa3E9334217"],
      function (err, response) {
        if (err) throw err;
        t.is(response.result, undefined);
        t.end();
      }
    );
  }
);
