import { middleware, validators } from "../validator";
import { Hash, HexNumber, Address, HexString } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import {
  InternalError,
  InvalidParamsError,
  RpcError,
  Web3Error,
} from "../error";
import { Query } from "../../db";
import { isAddressMatch } from "../../base/address";
import { RPC } from "ckb-js-toolkit";
import { GW_RPC_REQUEST_ERROR } from "../error-code";
import {
  deserializeL2TransactionWithAddressMapping,
  deserializeRawL2TransactionWithAddressMapping,
  serializeL2Transaction,
  serializeRawL2Transaction,
} from "@polyjuice-provider/base";
import {
  AddressMapping,
  L2TransactionWithAddressMapping,
  RawL2TransactionWithAddressMapping,
} from "@polyjuice-provider/godwoken/lib/addressTypes";

export class Poly {
  private query: Query;
  private rpc: RPC;

  constructor() {
    this.query = new Query(envConfig.databaseUrl);
    this.rpc = new RPC(envConfig.godwokenJsonRpc);

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

  async submitL2Transaction(args: any[]) {
    try {
      const data = args[0];
      const txWithAddressMapping: L2TransactionWithAddressMapping =
        deserializeL2TransactionWithAddressMapping(data);
      const l2_tx = serializeL2Transaction(txWithAddressMapping.tx);
      const result = await this.rpc.gw_submit_l2transaction(l2_tx);
      // if result is fine, then tx is legal, we can start thinking to store the address mapping
      // todo: check in eth tx data, not args
      this.saveAddressMappingToDb(
        txWithAddressMapping.addresses,
        txWithAddressMapping.tx.raw.args
      );
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async executeRawL2Transaction(args: any[]) {
    try {
      const data = args[0];
      const txWithAddressMapping: RawL2TransactionWithAddressMapping =
        deserializeRawL2TransactionWithAddressMapping(data);
      const raw_l2_tx = serializeRawL2Transaction(txWithAddressMapping.raw_tx);
      const result = await this.rpc.gw_execute_raw_l2transaction(raw_l2_tx);
      // if result is fine, then tx is legal, we can start thinking to store the address mapping
      // todo: check in eth tx data, not args
      this.saveAddressMappingToDb(
        txWithAddressMapping.addresses,
        txWithAddressMapping.raw_tx.args
      );
      return result;
    } catch (error) {
      parseError(error);
    }
  }

  async saveEthAddressGodwokenShortAddressMapping(
    args: [string, string]
  ): Promise<string> {
    try {
      const ethAddress = args[0];
      const godwokenShortAddress = args[1];

      // check if it exist
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

  private async saveAddressMappingToDb(
    addressMapping: AddressMapping,
    ethTxData: HexString
  ) {
    addressMapping.data.forEach(async (item) => {
      const ethAddress: HexString = item.eth_address;
      const godwokenShortAddress: HexString = item.gw_short_address;

      if (!ethTxData.includes(godwokenShortAddress)) {
        // the short address not in eth tx data param, don't save.
        return;
      }

      try {
        const exists = await this.query.accounts.exists(
          ethAddress,
          godwokenShortAddress
        );
        if (exists) {
          return;
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
        return;
      } catch (error) {
        console.log(
          `abort saving addressMapping [${godwokenShortAddress}]: ${ethAddress} , will keep saving the rest. =>`,
          error
        );
      }
    });
  }
}

function parseError(error: any): void {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);
    throw new RpcError(err.code, err.message);
  }

  throw new RpcError(GW_RPC_REQUEST_ERROR, error.message);
}
