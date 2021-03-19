const test = require('ava');
const { FilterManager } = require('../../lib/cache/index');

const filter = new FilterManager(1000, 1000);
const f = {
    address: '0x0000',
    fromBlock: 123,
    toBlock: 'latest',
    topics: [
        '0x00012103230230',
        '0x00000000000000'
    ],
};

const f1 = {
    address: '0x0000',
    fromBlock: 123,
    toBlock: 520,
    topics: [
        '0x00012103230230',
        '0x00000000000000'
    ],
}

test.serial('filter_install', t => {
    filter.install(f);
    filter.install(f1);
    t.is(filter.size(), 2);
});

test.serial('filter_get', t => {
    t.is(filter.get(1), f);
});

test.serial('filter_getLastPoll', t => {
    t.is(filter.getLastPoll(1), 0);
})

test.serial('filter_updateLastPoll', t => {
    filter.updateLastPoll(1, 25);
    t.is(filter.getLastPoll(1), 25);
})

test.serial('filter_uninstall', t => {
    filter.uninstall(1);
    t.is(filter.size(), 1);
});

test.serial.cb('filter_cache_expired', t => {
    setTimeout(() => {
        t.is(filter.size(), 0);
        t.end();
    }, 4000);
});