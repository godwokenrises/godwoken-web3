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

test.serial('filter_install', t => {
    filter.install(f);
    t.is(filter.size(), 1);
});

test.serial('filter_get', t => {
    t.is(filter.get(1), f);
});

test.serial('filter_remove', t => {
    filter.uninstall(1);
    t.is(filter.size(), 0);
});