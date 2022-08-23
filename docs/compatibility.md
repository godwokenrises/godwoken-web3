# ETH Compatibility

## RPC compatibility

### 1. `transaction.to` MUST be a Contract Address

The `to` member of a Godwoken transaction must be a contract.

#### Result

- In the following RPCs, the `to` parameter can only be a contract address and **CANNOT** be an EOA address:
  - eth_call
  - eth_estimateGas
  - eth_sendRawTransaction

#### Recommend workaround

- **Transfer Value From EOA To EOA**: Use the `transfer function` in [pCKB_ERC20_Proxy](https://github.com/nervosnetwork/godwoken-polyjuice/blob/ae65ef551/solidity/erc20/README.md) contract [combined](https://github.com/nervosnetwork/godwoken-polyjuice/blob/3f1ad5b322/solidity/erc20/SudtERC20Proxy_UserDefinedDecimals.sol#L154) with sUDT_ID = 1 (CKB a.k.a. [pCKB](https://github.com/nervosnetwork/godwoken/blob/develop/docs/life_of_a_polyjuice_transaction.md#pckb)).
   - mainnet_v1 pCKB_ERC20_Proxy contract: 0x7538C85caE4E4673253fFd2568c1F1b48A71558a (pCKB)
   - testnet_v1 pCKB_ERC20_Proxy contract: 0xE05d380839f32bC12Fb690aa6FE26B00Bd982613 (pCKB)

### 2. ZERO ADDRESS

Godwoken does not have the corresponding "zero address"(0x0000000000000000000000000000000000000000) concept, so Polyjuice won't be able to handle zero address as well.

#### Result

Transaction with zero address in from/to filed is not supported.

known issue: #246

#### Recommend workaround

- if you are trying to use zero address as a black hole to burn ethers, you can use `transfer function` in `CKB_ERC20_Proxy` to send ethers to zero address. more info can be found in the above section `Transfer Value From EOA To EOA`.

### 3. GAS LIMIT

Godwoken limit the transaction execution resource in CKB-VM with [Cycle Limit](https://docs-xi-two.vercel.app/docs/rfcs/0014-vm-cycle-limits/0014-vm-cycle-limits), we set the `RPC_GAS_LIMIT` to `50000000` for max compatibility with Ethereum toolchain, but the real gas limit you can use depends on such Cycle Limit.

## EVM compatibility

- [Godwoken-Polyjuice](https://github.com/nervosnetwork/godwoken-polyjuice/blob/compatibility-breaking-changes/docs/EVM-compatible.md)
