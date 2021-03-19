const jayson = require("jayson");
const test = require("ava");

const PORT = process.env.PORT || "3000";

// create a client
const client = jayson.client.http({
  port: PORT,
});

test("create client", (t) => {
  t.is(client.options.port, PORT);
});

module.exports = { client };
