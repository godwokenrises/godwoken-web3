# Eth Compatibility

## RPC compatibility

### Transfer Value From EOA To EOA

since there is no native token in Godwoken Polyjuice(while Ethereum has ETH as its native token), we disable transferring value from eoa to eoa ability in the Polyjuice EVM.

result:

- in the following RPCs, to_address parameter **CAN NOT** be EOA address:
  - eth_call
  - eth_estimateGas
  - eth_sendRawTransaction

recommend workaround:

- use Erc20 contract transfer function for transferring the token you want

## EVM compatibility

- [Godwoken-Polyjuice](https://github.com/nervosnetwork/godwoken-polyjuice/blob/compatibility-breaking-changes/docs/EVM-compatible.md)
