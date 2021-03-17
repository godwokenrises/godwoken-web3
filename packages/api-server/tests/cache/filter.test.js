const test = require('ava');
const { Filter } = require('../../lib/cache/index');

const filter = new Filter();
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
    filter.updateLastPollCache(1, 25);
    t.is(filter.getLastPoll(1), 25);
})

test.serial('filter_uninstall', t => {
    filter.uninstall(1);
    t.is(filter.size(), 1);
});