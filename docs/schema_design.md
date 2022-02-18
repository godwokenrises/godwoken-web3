# Schema Design

## Sql Schema(postgresql)
```sql
CREATE TABLE blocks (
    number NUMERIC PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    parent_hash TEXT NOT NULL,
    logs_bloom TEXT NOT NULL,
    gas_limit NUMERIC NOT NULL,
    gas_used NUMERIC NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    miner TEXT NOT NULL,
    size NUMERIC NOT NULL
    -- extra_data TEXT
    -- sha3Uncles TEXT,
    -- uncles []TEXT,
    -- state_root TEXT,
    -- transactions_root TEXT,
    -- receipts_root TEXT,
    -- difficulty NUMERIC,
    -- total_difficulty NUMERIC,
    -- nonce TEXT
);

CREATE TABLE transactions (
    id NUMERIC PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    eth_tx_hash TEXT UNIQUE NOT NULL,
    block_number NUMERIC REFERENCES blocks(number) NOT NULL,
    block_hash TEXT NOT NULL,
    transaction_index INTEGER NOT NULL,
    from_address TEXT NOT NULL,
    to_address TEXT,
    value NUMERIC NOT NULL,
    nonce NUMERIC,
    gas_limit NUMERIC,
    gas_price NUMERIC,
    input TEXT,
    v TEXT NOT NULL,
    r TEXT NOT NULL,
    s TEXT NOT NULL,
    cumulative_gas_used NUMERIC,
    gas_used NUMERIC,
    logs_bloom TEXT NOT NULL,
    contract_address TEXT,
    status BOOLEAN NOT NULL
);

CREATE INDEX ON transactions (block_number);
CREATE INDEX ON transactions (block_hash);
CREATE INDEX ON transactions (from_address);
CREATE INDEX ON transactions (to_address);
CREATE INDEX ON transactions (contract_address);
CREATE UNIQUE INDEX block_number_transaction_index_idx ON transactions (block_number, transaction_index);
CREATE UNIQUE INDEX block_hash_transaction_index_idx ON transactions (block_hash, transaction_index);

CREATE TABLE logs (
    id NUMERIC PRIMARY KEY,
    transaction_id NUMERIC REFERENCES transactions(id) NOT NULL,
    transaction_hash TEXT NOT NULL,
    transaction_index INTEGER NOT NULL,
    block_number NUMERIC REFERENCES blocks(number) NOT NULL,
    block_hash TEXT NOT NULL,
    address TEXT NOT NULL,
    data TEXT NOT NULL,
    log_index INTEGER NOT NULL,
    topics TEXT[] NOT NULL
);

CREATE INDEX ON logs (transaction_hash);
CREATE INDEX ON logs (block_hash);
CREATE INDEX ON logs (address);
CREATE INDEX ON logs (block_number);

CREATE TABLE accounts (
    id SERIAL PRIMARY KEY,
    eth_address bytea NOT NULL,
    gw_short_script_hash bytea NOT NULL
);

CREATE UNIQUE INDEX accounts_eth_address_unique ON accounts (eth_address);
CREATE INDEX accounts_gw_short_script_hash_index ON accounts (gw_short_script_hash);

CREATE TABLE error_transactions (
    id BIGSERIAL PRIMARY KEY,
    hash TEXT UNIQUE NOT NULL,
    block_number NUMERIC NOT NULL,
    cumulative_gas_used NUMERIC,
    gas_used NUMERIC,
    status_code NUMERIC NOT NULL,
    status_reason bytea NOT NULL
);

CREATE INDEX ON error_transactions (block_number);
CREATE INDEX ON error_transactions (hash);
```

## 字段含义

### block

- number: 区块高度，由于godwoken只会revert不会分叉，在同一个高度只存在一个区块，故可以作为主键
- hash: 区块哈希
- parent_hash: 上一个区块hash
- logs_bloom: 该区块内logs的bloom filter，用于快速查询状态变更
- gas_limit: 该区块最多能花的gas_limit, 等于各个交易的gas_limit之和
- 这个值在eth里面现在不超过12.5million
- gas_used: 该区块内所有交易花费的gas之和
- timestamp: 区块的时间戳
- miner: godwoken里指的是block producer，这里miner字段与web3接口保持一致
- size: 区块大小，bytes
- extrat_data: 矿工可选择填写该字段内容，默认返回空
- sha3Uncles: uncle数据的sha3哈希，默认all zeros hash
- uncles: uncle哈希的数组，默认返回空
- state_root: 状态树的根，可以对应godwoken L2Block的post_account.merkle_root，但考虑到这里的block只关联polyjuice和l2转账交易，这个值就无法使用，进一步，考虑到dapp一般不关心这个数，默认返回all zeros hash
- transaction_root: 同上，默认返回all zeros hash
- receipts_root: 同上，默认返回all zeros hash
- difficulty: 这个块儿的难度值，默认返回0
- total_difficulty: 链上累计的难度之和，默认返回0
- nonce: 表示proof-of-work证明，默认all zeros hash

### transaction
- hash: 交易哈希
- eth_tx_hash: 交易的以太坊格式交易哈希
- block_number：区块高度
- block_hash：区块哈希
- transaction_index：交易在区块里的位置，这个和L2Transaction在L2Block的位置存在差异
- from_address：交易发出方，对应godwoken里面L2Transaction的from_id
- to_address: 交易接受方，在eth中如果是合约创建交易则为null；在godwoken中需要解析L2Transaction的args（不同于to_id概念），提取出sudt转账交易的接受账户，或者是polyjuice交易的接受账户(合约)
- value: 转账额度(是sudt的转账还是polyjuice的转账？)
- nonce: 地址发出过的交易数量，单调递增（polyjuice交易是否有单独的nonce?)
- gas_limit: polyjuice交易的gas_limit，非polyjuice交易设置为0
- gas_price: polyjuice交易的gas_price，非polyjuice交易设置为0
- input: solidity合约调用的input，非polyjuice交易设置为null
- v: ECDSA recovery ID
- r: ECDSA signature
- s: ECDSA signature
- cumulative_gas_used: 该区块里当前交易和之前的交易花费的gas之和
- gas_used：交易实际花费的gas
- log_bloom：该交易中logs的bloom filter
- contract_address: 如果是合约创建交易，这个则为创建的合约的地址；否则为null
- status: 表示交易是否成功，0失败，1成功

### log
- transaction_id: 交易id，transaction表主键
- transaction_hash：交易哈希
- transaction_index：交易在区块中位置
- block_number：区块高度
- block_hash：区块哈希
- address：产生这条log的地址，一般是某个合约地址
- log_index：log在交易receipt中的位置
- topics：
  - topic[0]: Event的签名，`keccak(EVENT_NAME+"("+EVENT_ARGS.map(canonical_type_of).join(",")+")")` ，对于anonymous event不生成该topic
  - topic[1] ~ topic[3]: 被indexed字段修饰的Event参数
- data：non-indexed的Event参数

### accounts
- eth_address: eth address
- gw_short_script_hash: godwoken short script hash

## error_transactions
- id: id, primary key,
- hash: transaction hash,
- block_number: transaction block number,
- cumulative_gas_used: cumulative gas used,
- gas_used NUMERIC: gas used,
- status_code: error status code
- status_reason: error status reason
