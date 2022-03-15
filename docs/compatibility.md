# Eth Compatibility

## RPC compatibility

### Transfer Value From EOA To EOA

Since there is no native token in Godwoken Polyjuice(while Ethereum has ETH as its native token), we disable transferring value from EOA to EOA ability in Polyjuice EVM.

### Result

- in the following RPCs, to_address parameter **CAN NOT** be EOA address:
  - eth_call
  - eth_estimateGas
  - eth_sendRawTransaction

#### Recommend workaround

- Use the `transfer function` in [CKB_ERC20_Proxy](https://github.com/nervosnetwork/godwoken-polyjuice/blob/3f1ad5b/solidity/erc20/README.md) contract [combined](https://github.com/nervosnetwork/godwoken-polyjuice/blob/3f1ad5b322/solidity/erc20/SudtERC20Proxy_UserDefinedDecimals.sol#L154) with sUDT_ID = 1 (CKB a.k.a. pETH).

## EVM compatibility

- [Godwoken-Polyjuice](https://github.com/nervosnetwork/godwoken-polyjuice/blob/compatibility-breaking-changes/docs/EVM-compatible.md)
