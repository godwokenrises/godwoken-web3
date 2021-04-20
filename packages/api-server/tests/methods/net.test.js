const test = require('ava');
const { client } = require('../client');

test.cb('net_version', (t) => {
  return client.request('net_version', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, '1');
    t.end();
  });
});

test.cb('net_peerCount', (t) => {
  return client.request('net_peerCount', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, 0);
    t.end();
  });
});

test.cb('net_listening', (t) => {
  return client.request('net_listening', [], function (err, response) {
    if (err) throw err;
    t.is(response.result, true);
    t.end();
  });
});
