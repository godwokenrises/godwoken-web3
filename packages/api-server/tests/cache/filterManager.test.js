const test = require("ava");
const { FilterManager } = require("../../lib/cache/index");
const { asyncSleep } = require("./util");

const filter = new FilterManager(1000, 1000);
const f = {
  address: "0x0000",
  fromBlock: 123,
  toBlock: "latest",
  topics: ["0x00012103230230", "0x00000000000000"],
};

const f1 = {
  address: "0x0000",
  fromBlock: 123,
  toBlock: 520,
  topics: ["0x00012103230230", "0x00000000000000"],
};

let f_id;
let f1_id;

test.before("init-filter-manager", async (t) => {
  await filter._connect();
  await filter.store.client.sendCommand(["FLUSHDB"]);
});

test.serial("filter_install", async (t) => {
  f_id = await filter.install(f);
  f1_id = await filter.install(f1);
  const size = await filter.size();
  t.is(size, 2);
});

test.serial("filter_get", async (t) => {
  const _f = await filter.get(f_id);
  await t.deepEqual(_f, f);
});

test.serial("filter_getLastPoll", async (t) => {
  const lp = await filter.getLastPoll(f_id);
  t.is(Number(lp.toString(10)), 0);
});

test.serial("filter_updateLastPoll", async (t) => {
  await filter.updateLastPoll(f_id, BigInt(25));
  const lp = await filter.getLastPoll(f_id);
  console.log();
  t.is(Number(lp.toString(10)), 25);
});

test.serial("filter_uninstall", async (t) => {
  await filter.uninstall(f_id);
  const size = await filter.size();
  t.is(size, 1);
});

test.serial("filter_cache_expired", async (t) => {
  await asyncSleep(4000);
  const size = await filter.size();
  t.is(size, 0);
});
