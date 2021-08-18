import { middleware, validators } from "../validator";
import { Hash, HexNumber, Address } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import { InternalError, InvalidParamsError, Web3Error } from "../error";
import { Query } from "../../db";
import { isAddressMatch } from "../../base/address";

export class Poly {
  private query: Query;

  constructor() {
    this.query = new Query(envConfig.databaseUrl);

    this.getEthAddressByGodwokenShortAddress = middleware(
      this.getEthAddressByGodwokenShortAddress.bind(this),
      1,
      [validators.address]
    );

    this.saveEthAddressGodwokenShortAddressMapping = middleware(
      this.saveEthAddressGodwokenShortAddressMapping.bind(this),
      2,
      [validators.address, validators.address]
    );
  }

  async getEthAddressByGodwokenShortAddress(
    args: [string]
  ): Promise<Address | undefined> {
    try {
      const gwShortAddress = args[0];
      const account = await this.query.accounts.getByShortAddress(
        gwShortAddress
      );
      let ethAddress = account?.eth_address;
      console.log(
        `[from hash_map] eth address: ${ethAddress}, short_address: ${gwShortAddress}`
      );
      return ethAddress;
    } catch (error) {
      console.log(error);
      if (error.notFound) {
        throw new InvalidParamsError(
          "gw_short_address as key is not found on database."
        );
      }

      throw new InternalError(error.message);
    }
  }

  async saveEthAddressGodwokenShortAddressMapping(
    args: [string, string]
  ): Promise<string> {
    try {
      const ethAddress = args[0];
      const godwokenShortAddress = args[1];
      // todo: save before check if it not exsit;
      // TODO: check exists
      const exists = await this.query.accounts.exists(
        ethAddress,
        godwokenShortAddress
      );
      if (exists) {
        return "ok";
      }

      if (!isAddressMatch(ethAddress, godwokenShortAddress)) {
        throw new Error(
          "eth_address and godwoken_short_address unmatched! abort saving!"
        );
      }

      await this.query.accounts.save(ethAddress, godwokenShortAddress);

      console.log(
        `poly_save: insert one record, [${godwokenShortAddress}]: ${ethAddress}`
      );
      return "ok";
    } catch (error) {
      console.log(error);
      throw new InvalidParamsError(error.message);
    }
  }

  async getCreatorId(_args: []): Promise<HexNumber> {
    try {
      const creatorIdHex = toHexNumber(BigInt(envConfig.creatorAccountId));
      return creatorIdHex;
    } catch (err) {
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
    } catch (error) {
      throw new Web3Error(error.message);
    }
  }
}
