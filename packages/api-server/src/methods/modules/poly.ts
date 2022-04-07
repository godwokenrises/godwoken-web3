import { Hash, HexNumber, Address } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import { Web3Error } from "../error";
import { GodwokenClient } from "@godwoken-web3/godwoken";
const { version: web3Version } = require("../../../package.json");

export class Poly {
  private rpc: GodwokenClient;

  constructor() {
    this.rpc = new GodwokenClient(
      envConfig.godwokenJsonRpc,
      envConfig.godwokenReadonlyJsonRpc
    );
  }

  async getCreatorId(_args: []): Promise<HexNumber> {
    try {
      const creatorIdHex = toHexNumber(BigInt(envConfig.creatorAccountId));
      return creatorIdHex;
    } catch (err: any) {
      throw new Web3Error(err.message);
    }
  }

  // from in eth_call is optional, DEFAULT_FROM_ADDRESS fills it when empty
  async getDefaultFromId(_args: []): Promise<Address> {
    return envConfig.defaultFromId;
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

  async version() {
    const godwokenVersion = await this.rpc.getNodeInfo();
    return {
      web3Version,
      web3IndexerVersion: web3Version, // indexer and api-server should use the same version
      godwokenVersion,
    };
  }
}

// key: tipBlockHash first 8 bytes + memPollStateRoot first 8 bytes + dataHash first 8 bytes
function getPolyExecRawL2TxCacheKey(
  serializeRawL2Transaction: HexString,
  tipBlockHash: HexString,
  memPoolStateRoot: HexString
) {
  const hash =
    "0x" + keccakFromHexString(serializeRawL2Transaction).toString("hex");
  const id = `0x${tipBlockHash.slice(2, 18)}${memPoolStateRoot.slice(
    2,
    18
  )}${hash.slice(2, 18)}`;
  return id;
  // const key = `${POLY_RPC_KEY}:executeRawL2Transaction:${id}`;
  // return key;
}
