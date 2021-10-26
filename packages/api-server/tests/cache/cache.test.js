const test = require("ava");
const { CacheLifeSet } = require("../../lib/cache/index");
const { asyncSleep } = require("./util");

const cache = new CacheLifeSet(1000, 1000);

test.before("init-cache", async (t) => {
  await cache._connect();
  await cache.store.client.sendCommand(["FLUSHDB"]);
  cache.startWatcher();
});

test.serial("addlife", async (t) => {
  await cache.addLife("1", Date.now());
  await cache.addLife("2", Date.now());
  await cache.addLife("3", Date.now());
  const size = await cache.size();
  t.is(size, 3);
});

test.serial("updatelife", async (t) => {
  await cache.updateLife("1", 1716067047507);
  await asyncSleep(3000);
  const size = await cache.size();
  t.is(size, 1);
});
