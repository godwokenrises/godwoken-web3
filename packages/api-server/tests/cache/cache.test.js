const test = require('ava');
const { Cache } = require('../../lib/cache/index');

const cache = new Cache(1000, 1000);
cache.startWatcher();

test.serial('addlife', (t) => {
  cache.addLife(1, Date.now());
  cache.addLife(2, Date.now());
  cache.addLife(3, Date.now());
  t.is(cache.size(), 3);
});

test.serial.cb('updatelife', (t) => {
  cache.updateLife(1, 1716067047507);
  setTimeout(() => {
    t.is(cache.size(), 1);
    t.end();
  }, 3000);
});
