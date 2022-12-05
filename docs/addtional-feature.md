# Additional Feature

## Instant Finality

Ethereum requires a transaction to be on-chain (meaning the transaction is included in the latest block) before returning a transaction receipt with final status to users, so they know whether the transaction is a success or not.

Godwoken provides a faster way to confirm transactions. Once a transaction is verified in the mem-pool, the instant transaction receipt will be generated immediately. This feature is called `Instant Finality`.

If you want to build a low-latency user experience for on-chain interactions in your dApp, you could turn on `Instant Finality` feature by using the RPC **with an additional path or query parameters**:

```bash
# http
https://example_web3_rpc_url?instant-finality-hack=true
https://example_web3_rpc_url/instant-finality-hack

# websocket
ws://example_web3_rpc_url/ws?instant-finality-hack=true
```

**Note**: Environments like [Hardhat](https://github.com/NomicFoundation/hardhat) will swallow the HTTP URL's query parameter, so you might want to use the `/instant-finality-hack` path to overcome that.

Also notice that under `instant-finality-hack` mode, there might be some [compatibility issues](https://github.com/godwokenrises/godwoken-web3/issues/283) with Ethereum toolchain like `ether.js`. If you care more about compatibility, please use the bare RPC URL `https://example_web3_rpc_url`, which is considered to be the most compatible with Ethereum.

## Gasless Transaction

The gas fee is preventing new users step into the web3 world. Users must learn to get the native token(CKB or ETH) before playing a blockchain game or exchanging tokens with a DEX. The gasless feature can provide a way for developers to sponsor transaction fees for users to give them a smooth experience.

The gas feature is based on the ERC-4337 solution but way simpler. To use a such feature, users sign and send a special gasless transaction to call a specific smart contract named `Entrypoint`, then `Entrypoint` will call another smart contract named `Paymaster` deployed by developers to check if they are willing to pay the gas fee for this transaction. The special gasless transaction must satisfy the requirements:

- Must contain an `UserOperation` structure on the `tx.data` field, which contains the target contract and the paymaster address.
- Must set `tx.gasPrice` to 0
- The `tx.to` must be set to the `Entrypoint` contract.

```sh
struct UserOperation {
    address callContract;           # address of the target contract
    bytes callData;                 # call data
    uint256 callGasLimit;           # gas used to execute the call
    uint256 verificationGasLimit;   # gas used to verification
    uint256 maxFeePerGas;           # gas price
    uint256 maxPriorityFeePerGas;   # must equals to maxFeePerGas, reserved for EIP-1559
    bytes paymasterAndData;         # pay master address and extra data
}
```

More can be found [here](https://github.com/godwokenrises/godwoken/discussions/860#discussion-4568687)
