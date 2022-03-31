# APIs

## Ethereum Compatible Web3 RPC Modules

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
- eth_blockNumber
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
- eth_getTipNumber
- eth_subscribe (only for WebSocket)
- eth_unsubscribe (only for WebSocket)

### Usage

you can find most usage guidelines from Ethereum Rpc docs like <https://eth.wiki/json-rpc/API> ;

### Unsupported Methods

- eth_accounts (only wallet client can do this)
- eth_sign (only wallet client can do this)
- eth_signTransaction (only wallet client can do this)
- eth_sendTransaction (only wallet client can do this)
- eth_sendRawTransaction (for compatible reason, we use `gw_submit_l2Transaction` and `poly_submitL2Transaction` for submitting transactions)

## Additional Modules

### gw (Godwoken RPCs)

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

### Usage

checkout [Godwoken Docs](https://github.com/nervosnetwork/godwoken/blob/develop/docs/RPC.md)

### poly (Polyjuice RPCs)

- poly_getEthAddressByGodwokenShortAddress
- poly_getChainInfo
- poly_getDefaultFromAddress
- poly_getContractValidatorTypeHash
- poly_getRollupTypeHash
- poly_getRollupConfigHash
- poly_getEthAccountLockHash
- poly_getCreatorId
- poly_submitL2Transaction
- poly_executeRawL2Transaction

### Usage

#### poly_executeRawL2Transaction

> This method is similar to the concept of `"eth_call"` in Ethereum.

`poly_executeRawL2Transaction` is almost the same with `gw_execute_raw_l2Transaction`, but its first param `serializedRawL2TransactionWithAddressMapping` uses different molecule structure with an additional `addressMapping` filed.

- gw_execute_raw_l2Transaction
  - params: [serializedRawL2Transaction, blockNumber]
  - how to serialize: [code](https://github.com/nervosnetwork/polyjuice-provider/blob/main/packages/base/src/util.ts#L465-L468)
- poly_executeRawL2Transaction
  - params: [serializedRawL2TransactionWithAddressMapping, blockNumber]
  - how ot serialize: [code](https://github.com/nervosnetwork/polyjuice-provider/blob/main/packages/base/src/util.ts#L326-L335)

#### poly_submitL2Transaction

> This method is similar to the concept of `"eth_sendRawTransaction"` in Ethereum.

`poly_submitL2Transaction` is almost the same with `gw_submit_l2Transaction`, but its first param `serializedL2TransactionWithAddressMapping` use different molecule structure with an additional `addressMapping` filed.

- gw_submit_l2Transaction
  - params: [serializedL2Transaction]
  - how to serialize: [code](https://github.com/nervosnetwork/polyjuice-provider/blob/main/packages/base/src/util.ts#L460-L463)
- poly_submitL2Transaction
  - params: [serializedL2TransactionWithAddressMapping]
  - how ot serialize: [code](https://github.com/nervosnetwork/polyjuice-provider/blob/main/packages/base/src/util.ts#L374-L383)
