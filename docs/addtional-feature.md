# Additional Feature

## Instant Finality

Ethereum requires a transaction to be on-chain (meaning the transaction is included in the latest block) before returning a transaction receipt with final status to users, so they know whether the transaction is success or not. 

Godwoken provide a faster way to confirm transaction. Once a transaction is verified in the mempool, the instant transaction receipt will be generated immediately. This feature is called `Instant Finality`.

If you want to build a low latency user experience for on-chain interactions in your dApp, you could turn on `Instant Finality` feature by using the RPC **with additional path or query parameter**:

```bash
# http
https://example_web3_rpc_url?instant-finality-hack=true
https://example_web3_rpc_url/instant-finality-hack

# websocket
ws://example_web3_rpc_url/ws?instant-finality-hack=true
```

**Note**: Environments like [Hardhat](https://github.com/NomicFoundation/hardhat) will swallow the http url's query parameter, so you might want to use the `/instant-finality-hack` path to overcome that.

Also notice that under `instant-finality-hack` mode, there might be some [compatibility issue](https://github.com/godwokenrises/godwoken-web3/issues/283) with Ethereum toolchain like `ether.js`. If you care more about the compatibility, please use the bare RPC url `https://example_web3_rpc_url`, which is considered to be most compatible with Ethereum.
