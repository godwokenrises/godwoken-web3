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
COMPATIBLE_CHAIN_ID=<godwoken compatible chain id in integer>
CREATOR_ACCOUNT_ID=<your creator account id in integer>
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
ENABLE_CACHE_ETH_CALL=<optional, enable eth_call cache, default to false>
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
compatible_chain_id=<godwoken compatible_chain_id in integer>
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
- poly_getDefaultFromId
- poly_getContractValidatorTypeHash
- poly_getRollupTypeHash
- poly_getRollupConfigHash
- poly_getEthAccountLockHash
- poly_getCreatorId

## Examples
### web3_clientVersion

see: [docs](docs/apis.md)
