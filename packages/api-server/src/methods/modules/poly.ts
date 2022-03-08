import { Hash, HexNumber, Address } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import { Web3Error } from "../error";

export class Poly {
  constructor() {}

  async getCreatorId(_args: []): Promise<HexNumber> {
    try {
      const creatorIdHex = toHexNumber(BigInt(envConfig.creatorAccountId));
      return creatorIdHex;
    } catch (err: any) {
      throw new Web3Error(err.message);
    }
  }

  // from in eth_call is optional, DEFAULT_FROM_ADDRESS fills it when empty
  async getDefaultFromAddress(_args: []): Promise<Address> {
    return envConfig.defaultFromAddress;
  }

  async getContractValidatorTypeHash(args: []): Promise<Hash> {
    if (envConfig.polyjuiceValidatorTypeHash) {
      return envConfig.polyjuiceValidatorTypeHash;
    }
    throw new Web3Error("POLYJUICE_VALIDATOR_TYPE_HASH not found!");
  }

  async getRollupTypeHash(args: []): Promise<Hash> {
    if (envConfig.rollupTypeHash) {
      return envConfig.rollupTypeHash;
    }
    throw new Web3Error("ROLLUP_TYPE_HASH not found!");
  }

  async getRollupConfigHash(args: []): Promise<Hash> {
    if (envConfig.rollupConfigHash) {
      return envConfig.rollupConfigHash;
    }
    throw new Web3Error("ROLLUP_CONFIG_HASH not found!");
  }

  async getEthAccountLockHash(args: []): Promise<Hash> {
    if (envConfig.ethAccountLockHash) {
      return envConfig.ethAccountLockHash;
    }
    throw new Web3Error("ETH_ACCOUNT_LOCK_HASH not found!");
  }

  async getChainInfo(args: []): Promise<any> {
    try {
      const chainInfo = {
        rollupScriptHash: envConfig.rollupTypeHash || null,
        rollupConfigHash: envConfig.rollupConfigHash || null,
        ethAccountLockTypeHash: envConfig.ethAccountLockHash || null,
        polyjuiceContractTypeHash: envConfig.polyjuiceValidatorTypeHash || null,
        polyjuiceCreatorId: envConfig.creatorAccountId || null,
        chainId: envConfig.chainId || null,
      };
      return chainInfo;
    } catch (error: any) {
      throw new Web3Error(error.message);
    }
  }
}
