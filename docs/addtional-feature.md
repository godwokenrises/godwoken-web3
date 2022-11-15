# Additional Feature

## Instant Finality

Ethereum require a transaction to be on-chain(meaning the transaction is included in the latest block) before returning a final status(aka. transaction receipt) to users so they can know whether the transaction is success or not. 

Godwoken provide a quicker way to confirm transaction. Once the transaction is validated in mempool, users can get instant transaction receipt. This feature is called Instant Finality.

If your want to build a low latency user experience for on-chain interaction in your dapp, you can turn on such feature by using the RPC with additional path or query parameter:

```sh
# http
https://example_web3_rpc_url?instant-finality-hack=true
https://example_web3_rpc_url/instant-finality-hack

# websocket
ws://example_web3_rpc_url/ws?instant-finality-hack=true
```

Environment like [Hardhat](https://github.com/NomicFoundation/hardhat) will swallow the http url's query parameter, so you might want to use the `/instant-finality-hack` path to overcome that.

Also notice that under such mode, there might have some [compatibility issue](https://github.com/godwokenrises/godwoken-web3/issues/283) with Ethereum toolchain like `ether.js`. If you care more about the compatibility, please use the bare RPC url `https://example_web3_rpc_url`, which is consider to be most compatible with Ethereum.
