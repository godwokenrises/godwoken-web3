const test = require("ava");
const { FilterManager } = require("../../lib/cache/index");
const { asyncSleep } = require("./util");

const filterManager = new FilterManager(true, 1000);
const f = {
  address: "0x92384EF7176DA84a957A9FE9119585AB2dc7c57d",
  fromBlock: "0x123",
  toBlock: "latest",
  topics: [
    "0x0001020000000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ],
};

const f1 = {
  address: "0x92384EF7176DA84a957A9FE9119585AB2dc7c57d",
  fromBlock: "0x123",
  toBlock: "0x520",
  topics: [
    "0x00000000f0000000000000000000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000000000000000000000000000",
  ],
};

let f_id;
let f1_id;

test.before("init-filter-manager", async (t) => {
  await filterManager.connect();
  await filterManager.store.client.sendCommand(["FLUSHDB"]);
});

test.serial("filter_install", async (t) => {
  f_id = await filterManager.install(f);
  f1_id = await filterManager.install(f1);
  const size = await filterManager.size();
  t.is(size, 2);
});

test.serial("filter_get", async (t) => {
  const _f = await filterManager.get(f_id);
  await t.deepEqual(_f, f);
});

test.serial("filter_getLastPoll", async (t) => {
  const lp = await filterManager.getLastPoll(f_id);
  t.is(Number(lp.toString(10)), 0);
});

test.serial("filter_updateLastPoll", async (t) => {
  await filterManager.updateLastPoll(f_id, BigInt(25));
  const lp = await filterManager.getLastPoll(f_id);
  console.log();
  t.is(Number(lp.toString(10)), 25);
});

test.serial("filter_uninstall", async (t) => {
  await filterManager.uninstall(f_id);
  const size = await filterManager.size();
  t.is(size, 1);
});

test.serial("filter_cache_expired", async (t) => {
  await asyncSleep(4000);
  const size = await filterManager.size();
  t.is(size, 0);
});
