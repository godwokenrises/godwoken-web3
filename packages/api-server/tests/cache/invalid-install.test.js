const test = require("ava");
const { FilterManager } = require("../../lib/cache/index");
const { MAX_FILTER_TOPIC_ARRAY_LENGTH } = require("../../lib/cache/constant");

const filter = new FilterManager(true, 1000);

const invalid_f0 = {
  address: "0x0000",
  fromBlock: "0x123",
  toBlock: "latest",
  topics: [
    "0x0001020000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ],
};

const invalid_f1 = {
  address: "0x92384EF7176DA84a957A9FE9119585AB2dc7c57d",
  fromBlock: "0x123",
  toBlock: "latest",
  topics: Array(21).fill(
    "0x0001020000000000000000000000000000000000000000000000000000000000"
  ),
};

const invalid_f2 = {
  address: "0x92384EF7176DA84a957A9FE9119585AB2dc7c57d",
  fromBlock: "0x123",
  toBlock: "0x520",
  topics: [
    "0x00000000f0000000000000000000000000000000000000000000000000000000",
    Array(21).fill(
      "0x0001020000000000000000000000000000000000000000000000000000000000"
    ),
  ],
};

test.before("init-filter-manager", async (t) => {
  await filter.connect();
  await filter.store.client.sendCommand(["FLUSHDB"]);
});

test.serial("filter_install", async (t) => {
  const err1 = await t.throwsAsync(async () => {
    await filter.install(invalid_f0);
  });
  const err2 = await t.throwsAsync(async () => {
    await filter.install(invalid_f1);
  });
  const err3 = await t.throwsAsync(async () => {
    await filter.install(invalid_f2);
  });
  t.is(
    err1.message,
    `invalid argument 0: address must be a 20 bytes-length hex string`
  );
  t.is(
    err2.message,
    `got FilterTopics.length ${invalid_f1.topics.length}, expect limit: ${MAX_FILTER_TOPIC_ARRAY_LENGTH}`
  );
  t.is(
    err3.message,
    `got one or more topic item's length ${invalid_f2.topics[1].length}, expect limit: ${MAX_FILTER_TOPIC_ARRAY_LENGTH}`
  );
});
