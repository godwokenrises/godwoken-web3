# Godwoken Web API


## Development

### Config database

```
$ cat > ./packages/api-server/.env <<EOF
DATABASE_URL=postgres://username:password@localhost:5432/your_db
GODWOKEN_JSON_RPC=<godwoken rpc>
EOF
$ yarn
$ yarn workspace @godwoken-web3/api-server reset_database
```

### Start API server

```
yarn workspace @godwoken-web3/godwoken tsc
yarn workspace @godwoken-web3/api-server start
```

Test JSON RPC
```
yarn workspace @godwoken-web3/api-server test 
```

### Call JSON RPC from CURL

```
// eth_getBlockByHash
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","method":"eth_getBlockByHash","params": ["0x3c9c46a46b17361cd1ac3ed3401c9a268095c1810bf991c470c139f8441e1d0b",false],"id":1}'

// eth_getTransactionByHash
curl http://localhost:3000 -X POST -H "Content-Type: application/json" -d '{"jsonrpc": "2.0", "method":"eth_getTransactionByHash", "params": ["0x7e9455f7fe58f804991a720d5a6d30ab9aa18a36cf044db6a768ce9b0c7754fc"], "id": 1}'

```
