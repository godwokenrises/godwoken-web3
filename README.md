# Godwoken Web3 API

A Web3 RPC compatible layer build upon Godwoken/Polyjuice.

## Development

### Config database

```bash
$ cat > ./packages/api-server/.env <<EOF
DATABASE_URL=postgres://username:password@localhost:5432/your_db
GODWOKEN_JSON_RPC=<godwoken rpc>
GODWOKEN_READONLY_JSON_RPC=<optional, default equals to GODWOKEN_JSON_RPC>
ETH_ACCOUNT_LOCK_HASH=<eth account lock script hash>
ROLLUP_TYPE_HASH=<godwoken rollup type hash>
ROLLUP_CONFIG_HASH=<godwoken rollup config hash>
CHAIN_ID=<your chain id in integer>
CREATOR_ACCOUNT_ID=<your creator account id in integer>
DEFAULT_FROM_ADDRESS=<default from eth address>
DEFAULT_FROM_ID=<default from eth address's godwoken account id>
POLYJUICE_VALIDATOR_TYPE_HASH=<godwoken polyjuice validator type hash>
L2_SUDT_VALIDATOR_SCRIPT_TYPE_HASH=<l2 sudt validator script type hash>
ETH_ADDRESS_REGISTRY_ACCOUNT_ID=<required, eth address registry account id>

TRON_ACCOUNT_LOCK_HASH=<tron account lock script hash, optional>
SENTRY_DNS=<sentry dns, optional>
SENTRY_ENVIRONMENT=<sentry environment, optional, default to `development`>,
NEW_RELIC_LICENSE_KEY=<new relic license key, optional>
NEW_RELIC_APP_NAME=<new relic app name, optional, default to 'Godwoken Web3'>
CLUSTER_COUNT=<cluster count, optional, default to num of cpus>
REDIS_URL=redis://user:password@localhost:6379 <redis url, optional, default to localhost on port 6379>
PG_POOL_MAX=<pg pool max count, optional, default to 20>
GAS_PRICE_CACHE_SECONDS=<seconds, optional, default to 0, and 0 means no cache>
EXTRA_ESTIMATE_GAS=<eth_estimateGas will add this number to result, optional, default to 0>
EOF

$ yarn

# For api-server & indexer
$ DATABASE_URL=<your database url> make migrate

# Migrate accounts data from hashmap db to sql if need
# relative hashmap db path is relative to packages/api-server
# and will use packages/api-server/lib/hashmap-db as default.
$ yarn run migrate-accounts <your hashmap db path>
For example:
$ yarn run migrate-accounts ./hashmap-db

# Only for test purpose
$ yarn workspace @godwoken-web3/api-server reset_database
```

ERC20 address allowlist

```bash
$ cat > ./packages/api-server/allowed-addresses.json <<EOF
[
  "<Your address 1>",
  "<Your address 2>"
]
EOF
```

rate limit config

```bash
$ cat > ./packages/api-server/rate-limit-config.json <<EOF
{
  "expired_time_milsec": 60000,
  "methods": {
    "poly_executeRawL2Transaction": 30,
    "<rpc method name>": <max requests number in expired_time>
  }
}
EOF
```

### Config Indexer

Sync block from godwoken.

```bash
$ cat > ./indexer-config.toml <<EOF
l2_sudt_type_script_hash=<l2 sudt validator script type hash>
polyjuice_type_script_hash=<godwoken polyjuice validator type hash>
rollup_type_hash=<godwoken rollup type hash>
eth_account_lock_hash=<eth account lock script hash>
tron_account_lock_hash=<tron account lock script hash, optional>
godwoken_rpc_url=<godwoken rpc>
ws_rpc_url=<godwoken websocket rpc>
pg_url="postgres://username:password@localhost:5432/your_db"
EOF
```

Or just run script, copy configs from `packages/api-server/.env` file.

```bash
node scripts/generate-indexer-config.js <websocket rpc url>
``` 

### Start Indexer

```bash
cargo build --release
./target/release/gw-web3-indexer
```

### Start API server

```bash
yarn run build:godwoken
yarn run start
```

#### Start in production mode

```bash
yarn run build && yarn run start:prod
```

#### Start via pm2

```bash
yarn run build && yarn run start:pm2
```

#### Start using docker image

```bash
docker run -d -it -v <YOUR .env FILE PATH>:/godwoken-web3/packages/api-server/.env  -w /godwoken-web3  --name godwoken-web3 nervos/godwoken-web3-prebuilds:<TAG> bash -c "yarn workspace @godwoken-web3/api-server start:pm2"
```

then you can monit web3 via pm2 inside docker container:

```bash
docker exec -it <CONTAINER NAME> /bin/bash
```
```
$ root@ec562fe2172b:/godwoken-web3# pm2 monit
```
Normal mode: http://your-url/

Eth wallet mode: http://your-url/eth-wallet (for wallet like metamask, please connect to this url)

WebSocket url: ws://your-url/ws

### Docker Prebuilds

local development:

```sh
make build-test-image # (tag: latest-test)
```

push to docker:

```sh
make build-push # needs login, will ask you for tag
```

resource:

- docker image: https://hub.docker.com/repository/docker/nervos/godwoken-web3-prebuilds
- code is located in `/godwoken-web3` with node_modules already installed and typescript compiled to js code.

## Web3 RPC Modules

### net

- net_version
- net_peerCount
- net_listening

### web3

- web3_sha3
- web3_clientVersion

### eth
- eth_chainId
- eth_protocolVersion
- eth_syncing
- eth_coinbase
- eth_mining
- eth_hashrate
- eth_gasPrice
- eth_accounts
- eth_blockNumber
- eth_sign
- eth_signTransaction
- eth_sendTransaction
- eth_getBalance
- eth_getStorageAt
- eth_getTransactionCount
- eth_getCode
- eth_call
- eth_estimateGas
- eth_getBlockByHash
- eth_getBlockByNumber
- eth_getBlockTransactionCountByHash
- eth_getBlockTransactionCountByNumber
- eth_getUncleByBlockHashAndIndex
- eth_getUncleByBlockNumberAndIndex
- eth_getUncleCountByBlockHash
- eth_getCompilers
- eth_getTransactionByHash
- eth_getTransactionByBlockHashAndIndex
- eth_getTransactionByBlockNumberAndIndex
- eth_getTransactionReceipt
- eth_newFilter
- eth_newBlockFilter
- eth_newPendingTransactionFilter
- eth_uninstallFilter
- eth_getFilterLogs
- eth_getFilterChanges
- eth_getLogs
- eth_sendRawTransaction
- eth_getTipNumber
- eth_gw_executeL2Tranaction
- eth_gw_submitL2Transaction
- eth_gw_getAccountIdByScriptHash
- eth_gw_getScriptHashByAccountId
- eth_gw_getNonce
- eth_gw_getTransactionReceipt
- eth_subscribe (only for WebSocket)
- eth_unsubscribe (only for WebSocket)

### gw

- gw_ping
- gw_get_tip_block_hash
- gw_get_block_hash
- gw_get_block
- gw_get_block_by_number
- gw_get_balance
- gw_get_storage_at
- gw_get_account_id_by_script_hash
- gw_get_nonce
- gw_get_script
- gw_get_script_hash
- gw_get_data
- gw_get_transaction_receipt
- gw_execute_l2transaction
- gw_execute_raw_l2transaction
- gw_submit_l2transaction
- gw_submit_withdrawal_request

### poly
- poly_getChainInfo
- poly_getDefaultFromAddress
- poly_getContractValidatorTypeHash
- poly_getRollupTypeHash
- poly_getRollupConfigHash
- poly_getEthAccountLockHash
- poly_getCreatorId

## Examples
### web3_clientVersion

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"web3_clientVersion","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"Godwoken/v1.0.0/darwin/node14.13.1"}
```

### net_version

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_version","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"1"}
```

### net_peerCount
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_peerCount","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x0"}
```
### net_listening
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"net_listening","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":true}
```

### eth_protocolVersion
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_protocolVersion","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":65}
```

### eth_blockNumber
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x18d}
```

### eth_getBlockByHash

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getBlockByHash","params": ["0xb22bb8fd026613ea7674b181261248d38d190419a7870986b6528d4a6622ba0a",false],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":{"number":"0xde","hash":"0xb22bb8fd026613ea7674b181261248d38d190419a7870986b6528d4a6622ba0a","parentHash":"0x03deb171c1d9e703645f3e20e36137f7d918b5b5932f81b5948bdb9092a8e2a4","gasLimit":"0x0","gasLrice":"0x0","miner":"0x0000000000000000000000000000000000000000","size":"0x164","logsBloom":"0x","transactions":["0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b"],"timestamp":0,"mixHash":"0x0000000000000000000000000000000000000000000000000000000000000000","nonce":"0x0000000000000000","stateRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","sha3Uncles":"0x0000000000000000000000000000000000000000000000000000000000000000","receiptsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","transactionsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","uncles":[],"totalDifficulty":"0x0","extraData":"0x"}}
```

### eth_getBlockByNumber


```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getBlockByNumber","params": ["0xde",false],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":{"number":"0xde","hash":"0xb22bb8fd026613ea7674b181261248d38d190419a7870986b6528d4a6622ba0a","parentHash":"0x03deb171c1d9e703645f3e20e36137f7d918b5b5932f81b5948bdb9092a8e2a4","gasLimit":"0x0","gasLrice":"0x0","miner":"0x0000000000000000000000000000000000000000","size":"0x164","logsBloom":"0x","transactions":["0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b"],"timestamp":0,"mixHash":"0x0000000000000000000000000000000000000000000000000000000000000000","nonce":"0x0000000000000000","stateRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","sha3Uncles":"0x0000000000000000000000000000000000000000000000000000000000000000","receiptsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","transactionsRoot":"0x0000000000000000000000000000000000000000000000000000000000000000","uncles":[],"totalDifficulty":"0x0","extraData":"0x"}}
```

### eth_getTransactionByHash

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getTransactionByHash", "params": ["0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":{"hash":"0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b","blockHash":"0xb22bb8fd026613ea7674b181261248d38d190419a7870986b6528d4a6622ba0a","blockNumber":"0xde","transactionIndex":"0x0","from":"0x3db4a5310fe102430eb457c257e695795985fd73","to":"0x46beac96b726a51c5703f99ec787ce12793dae11","gas":"0x0","gasPrice":"0x1","input":null,"nonce":"0x1","value":"0xa","v":"0xc4cf76851498d8cb6671c366f2d58e9aa70cf55b998ec4335f1e23dfaeab34","r":"0x3539d9d6018d74b1b9357bab7e16e46f099ba46346ad230854577196f362f3","s":"0x01"}}
```

### eth_getTransactionReceipt
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getTransactionReceipt", "params": ["0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":{"transactionHash":"0xbb9d52bb10e36205cb4e7af8c4ac573f609a0f209d095e53f0f66c81b497169b","blockHash":"0xb22bb8fd026613ea7674b181261248d38d190419a7870986b6528d4a6622ba0a","blockNumber":"0xde","transactionIndex":"0x0","gasUsed":"0x0","cumulativeGasUsed":"0x0","logsBloom":"0x","logs":[],"contractAddress":null,"status":"0x1"}}
```

### eth_getTransactionCount

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getTransactionCount", "params": ["0x3db4a5310fe102430eb457c257e695795985fd73", "latest"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x2"}

```
### eth_gasPrice
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_gasPrice","params": [],"id":1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x1"}
```

### eth_getBalance

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getBalance", "params": ["0x3db4a5310fe102430eb457c257e695795985fd73", "latest"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x746a5287f6"}

```

### eth_getCode

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getCode", "params": ["0x0500000000000000000000000000000000000000", "0x30c"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x60806040526004361060295760003560e01c806360fe47b114602f5780636d4ce63c14605b576029565b60006000fd5b60596004803603602081101560445760006000fd5b81019080803590602001909291905050506084565b005b34801560675760006000fd5b50606e6094565b6040518082815260200191505060405180910390f35b8060006000508190909055505b50565b6000600060005054905060a2565b9056fea2646970667358221220044daf4e34adffc61c3bb9e8f40061731972d32db5b8c2bc975123da9e988c3e64736f6c63430006060033"}

```

### eth_getStorageAt

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getStorageAt", "params": ["0x0c00000000000000000000000000000000000000","0x0", "latest"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x0000000000000000000000000000000000000000000000000000000000000d10"}
```

### eth_call
```
// Call SimpleStorage:set
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_call", "params": [{"from": "0x46beaC96B726a51C5703f99eC787ce12793Dae11","to": "0x0c6c27bfd10b83c36bd5a3bdf768995a04000000", "gas": "0xf4240", "gasPrice": "0x1", "value": "0x0", "data": "0x60fe47b10000000000000000000000000000000000000000000000000000000000000002"}, "latest"], "id": 1}'
// Response
{"jsonrpc":"2.0","id":1,"result":"0x"}

// Call SimpleStorage:get 
// Request
 curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_call", "params": [{"from": "0x46beaC96B726a51C5703f99eC787ce12793Dae11","to": "0x0c6c27bfd10b83c36bd5a3bdf768995a04000000", "gas": "0xf4240", "gasPrice": "0x1", "value": "0x0", "data": "0x6d4ce63c"}, "latest"], "id": 1}'
// Response
{"jsonrpc":"2.0","id":1,"result":"0x000000000000000000000000000000000000000000000000000000000000007b"}
```

### eth_estimateGas
```
// Call SimpleStorage:set
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_estimateGas", "params": [{"from": "0x46beaC96B726a51C5703f99eC787ce12793Dae11","to": "0x0c6c27bfd10b83c36bd5a3bdf768995a04000000", "gas": "0xf4240", "gasPrice": "0x1", "value": "0x0", "data": "0x60fe47b10000000000000000000000000000000000000000000000000000000000000002"}], "id": 1}'
// Response
{"jsonrpc":"2.0","id":1,"result":"0x5c43"}
```

### eth_sign | eth_signTransaction | eth_sendTransaction

These API are not supported by a web3 rpc layer.

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_sign", "params": [], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"eth_sign is not supported!"}
```

### gw_get_script_hash

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"gw_get_script_hash", "params": ["0x0"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0xdb5b85ffffb98bb103a8763a6be8c02d8442f232061e1e644b25beba4b1693c1"}

```

### gw_get_script

```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"gw_get_script", "params": ["0xdb5b85ffffb98bb103a8763a6be8c02d8442f232061e1e644b25beba4b1693c1"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":{"code_hash":"0x841f75a94dbac1b2b400f29d55c02e5535e8ccca38e26c4245022f31f3ff2e81","hash_type":"type","args":"0x599950fbd06d2592d2903633c740f2ad9578ab7aee45d6d0d9f0c07f093417a6"}}  

```

### gw_get_nonce
```
// Request
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"gw_get_nonce", "params": ["0x2"], "id": 1}'

// Response
{"jsonrpc":"2.0","id":1,"result":"0x1"}

```
