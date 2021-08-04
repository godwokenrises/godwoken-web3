import { middleware, validators } from "../validator";
import { HashMap } from "../../hashmap";
import { Hash, HexNumber, Address } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import { InternalError, InvalidParamsError, Web3Error } from "../error";

export class Poly {
  private hashMap: HashMap;

  constructor() {
    this.hashMap = new HashMap();

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

  async getEthAddressByGodwokenShortAddress(args: [string]): Promise<Address> {
    try {
      const gw_short_adddress = args[0];
      const eth_addrss = await this.hashMap.query(gw_short_adddress);
      console.log(
        `[from hash_map] eth address: ${eth_addrss}, short_address: ${gw_short_adddress}`
      );
      return eth_addrss;
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
      const eth_address = args[0];
      const godwoken_short_address = args[1];
      // todo: save before check if it not exsit;
      await this.hashMap.save(godwoken_short_address, eth_address);
      console.log(
        `poly_hashmap: insert one record, [${godwoken_short_address}]: ${eth_address}`
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
    if (envConfig.rollupTypeHash) {
      return envConfig.rollupTypeHash;
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
        rollupScriptHash: envConfig.rollupTypeHash,
        rollupConfigHash: envConfig.rollupConfigHash,
        ethAccountLockTypeHash: envConfig.ethAccountLockHash,
        polyjuiceContractTypeHash: envConfig.polyjuiceValidatorTypeHash,
        polyjuiceCreatorId: envConfig.creatorAccountId,
        chainId: envConfig.chainId,
      };
      return chainInfo;
    } catch (error) {
      throw new Web3Error(error.message);
    }
  }
}
