const test = require("ava");
const { FilterManager } = require("../../lib/cache/index");
const { asyncSleep } = require("./util");

const filter = new FilterManager(1000, 1000, true);
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
  await filter.connect();
  await filter.cacheLifeSet.store.client.sendCommand(["FLUSHDB"]);
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
