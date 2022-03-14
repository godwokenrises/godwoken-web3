# Eth Compatibility

## RPC compatibility

### Transfer Value From EOA To EOA

due to security reason for Godwoken, we disable transferring value from eoa to eoa ability in the Polyjuice EVM.

result:

- in the following RPCs, to_address parameter **CAN NOT** be EOA address:
  - eth_call
  - eth_estimateGas
  - eth_sendRawTransaction

## EVM compatibility

- [Godwoken-Polyjuice](https://github.com/nervosnetwork/godwoken-polyjuice/blob/compatibility-breaking-changes/docs/EVM-compatible.md)
