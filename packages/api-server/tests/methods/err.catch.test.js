const test = require("ava");
const { client } = require("../client");

test.cb("gw_get_storage_at", (t) => {
  client.request("gw_get_storage_at", [], function (err, response) {
    if (err) throw err;
    t.is(response.error.code, -32002);
    t.end();
  });
});

test.cb("gw_get_nonce", (t) => {
  client.request("gw_get_nonce", ["0xasdf"], function (err, response) {
    if (err) throw err;
    t.is(response.error.code, -32002);
    t.end();
  });
});

test.cb("gw_execute_raw_l2transaction", (t) => {
  client.request(
    "gw_execute_raw_l2transaction",
    [
      "0x5c00000014000000180000001c0000002000000004000000140000001300000038000000ffffff504f4c590000a0724e18090000000000000000000000000000000000000000000000000000000000000000000004000000d504ea1d",
    ],
    function (err, response) {
      if (err) throw err;
      console.log(response);
      t.is(response.error.code, -32002);
      t.end();
    }
  );
});
