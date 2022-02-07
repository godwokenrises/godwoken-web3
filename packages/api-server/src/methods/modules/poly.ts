import { middleware, validators } from "../validator";
import { Hash, HexNumber, Address, HexString } from "@ckb-lumos/base";
import { toHexNumber } from "../../base/types/uint";
import { envConfig } from "../../base/env-config";
import { InternalError, InvalidParamsError, Web3Error } from "../error";
import { Query } from "../../db";
import { isAddressMatch, isShortAddressOnChain } from "../../base/address";
import {
  decodeArgs,
  deserializeL2TransactionWithAddressMapping,
  deserializeRawL2TransactionWithAddressMapping,
  deserializeAbiItem,
  getAddressesFromInputDataByAbi,
  EMPTY_ABI_ITEM_SERIALIZE_STR,
} from "@polyjuice-provider/base";
import { AbiItem } from "@polyjuice-provider/godwoken/lib/abiTypes";
import {
  L2TransactionWithAddressMapping,
  RawL2TransactionWithAddressMapping,
} from "@polyjuice-provider/godwoken/lib/addressTypes";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { parseGwRpcError } from "../gw-error";
import {
  POLY_EXECUTE_RAW_L2TX_CACHE_TIME_MILSECS,
  POLY_RPC_KEY,
} from "../../cache/constant";
import { Store } from "../../cache/store";
import { keccakFromHexString } from "ethereumjs-util";

export class Poly {
  private query: Query;
  private rpc: GodwokenClient;
  private polyCache: Store;

  constructor() {
    this.query = new Query();
    this.rpc = new GodwokenClient(
      envConfig.godwokenJsonRpc,
      envConfig.godwokenReadonlyJsonRpc
    );

    this.polyCache = new Store(
      envConfig.redisUrl,
      true,
      POLY_EXECUTE_RAW_L2TX_CACHE_TIME_MILSECS
    );
    this.polyCache.init();

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
      const l2Tx = txWithAddressMapping.tx;
      const result = await this.rpc.submitL2Transaction(l2Tx);
      // if result is fine, then tx is legal, we can start thinking to store the address mapping
      await saveAddressMapping(this.query, this.rpc, txWithAddressMapping);
      return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async executeRawL2Transaction(args: any[]) {
    try {
      const data = args[0];

      // check cache result
      const key = getPolyExecRawL2TxCacheKey(data);
      let stringResult = await this.polyCache.get(key);
      if (stringResult != null) {
        console.debug(`using cache: ${key} -> ${stringResult}`);
        const jsonResult = JSON.parse(stringResult);
        return jsonResult;
      }

      const txWithAddressMapping: RawL2TransactionWithAddressMapping =
        deserializeRawL2TransactionWithAddressMapping(data);
      const rawL2Tx = txWithAddressMapping.raw_tx;
      const jsonResult = await this.rpc.executeRawL2Transaction(rawL2Tx);
      stringResult = JSON.stringify(jsonResult);
      if (stringResult != null) {
        console.debug(`update cache: ${key} -> ${stringResult}`);
        this.polyCache.insert(key, stringResult);
      }

      return jsonResult;

      // const txWithAddressMapping: RawL2TransactionWithAddressMapping =
      //   deserializeRawL2TransactionWithAddressMapping(data);
      // const rawL2Tx = txWithAddressMapping.raw_tx;

      // const result = await this.rpc.executeRawL2Transaction(rawL2Tx);
      // // if result is fine, then tx is legal, we can start thinking to store the address mapping
      // await saveAddressMapping(this.query, this.rpc, txWithAddressMapping);
      // return result;
    } catch (error) {
      parseGwRpcError(error);
    }
  }

  async saveEthAddressGodwokenShortAddressMapping(
    args: [string, string]
  ): Promise<string> {
    // TODO: remove this function later
    // throw new Web3Error(
    //   "this method is deprecated! please upgrade @polyjuice-provider over 0.0.1-rc10 version! see: https://www.npmjs.com/org/polyjuice-provider"
    // );
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
}

async function saveAddressMapping(
  query: Query,
  rpc: GodwokenClient,
  txWithAddressMapping:
    | L2TransactionWithAddressMapping
    | RawL2TransactionWithAddressMapping
) {
  console.log(JSON.stringify(txWithAddressMapping, null, 2));

  if (
    txWithAddressMapping.addresses.length === "0x0" ||
    txWithAddressMapping.addresses.data.length === 0
  ) {
    console.log(`empty addressMapping, abort saving.`);
    return;
  }

  if (txWithAddressMapping.extra === EMPTY_ABI_ITEM_SERIALIZE_STR) {
    console.log(`addressMapping without abiItem, abort saving.`);
    return;
  }

  let rawTx;
  if ("raw_tx" in txWithAddressMapping) {
    rawTx = txWithAddressMapping.raw_tx;
  } else {
    rawTx = txWithAddressMapping.tx.raw;
  }
  const ethTxData = decodeArgs(rawTx.args).data;
  const abiItemStr = txWithAddressMapping.extra;
  const abiItem: AbiItem = deserializeAbiItem(abiItemStr);

  // special case: contract deployment
  // todo: since deploy transaction's inputData has no function signature
  // we just check if ethTxInputData include substring of address for simplicity
  // later we can rewrite serialization to decode the exact data using abiItem and bytecode length
  const creatorIdHexNumber =
    "0x" + BigInt(envConfig.creatorAccountId).toString(16);
  if (abiItem.type === "constructor" && rawTx.to_id === creatorIdHexNumber) {
    if (!containsAddressType(abiItem)) {
      console.log(
        `constructor abiItem ${JSON.stringify(
          abiItem
        )} doesn't contains address type, abort saving.`
      );
      return;
    }

    return await saveConstructorArgsAddressMapping(
      query,
      rpc,
      ethTxData,
      txWithAddressMapping
    );
  }

  // normal contract call, strict check if abiItem matched.
  const addressesFromEthTxData = getAddressesFromInputDataByAbi(
    ethTxData,
    abiItem
  );
  if (addressesFromEthTxData.length === 0) {
    console.log(
      `eth tx data ${ethTxData} contains no valid address, abort saving.`
    );
    return;
  }

  await Promise.all(
    txWithAddressMapping.addresses.data.map(async (item) => {
      const ethAddress: HexString = item.eth_address;
      const godwokenShortAddress: HexString = item.gw_short_address;

      if (!addressesFromEthTxData.includes(godwokenShortAddress)) {
        console.log(
          `illegal address mapping, since godwoken_short_address ${godwokenShortAddress} is not in the ethTxData. expected addresses: ${JSON.stringify(
            addressesFromEthTxData,
            null,
            2
          )}`
        );
        return;
      }

      try {
        const exists = await query.accounts.exists(
          ethAddress,
          godwokenShortAddress
        );
        if (exists) {
          console.log(
            `abort saving, since godwoken_short_address ${godwokenShortAddress} is already saved on database.`
          );
          return;
        }
        if (!isAddressMatch(ethAddress, godwokenShortAddress)) {
          throw new Error(
            `eth_address ${ethAddress} and godwoken_short_address ${godwokenShortAddress} unmatched! abort saving!`
          );
        }
        const isExistOnChain = await isShortAddressOnChain(
          rpc,
          godwokenShortAddress
        );
        if (isExistOnChain) {
          console.log(
            `abort saving, since godwoken_short_address ${godwokenShortAddress} is already on chain.`
          );
          return;
        }

        await query.accounts.save(ethAddress, godwokenShortAddress);
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
    })
  );
}

async function saveConstructorArgsAddressMapping(
  query: Query,
  rpc: GodwokenClient,
  ethTxData: string,
  txWithAddressMapping:
    | L2TransactionWithAddressMapping
    | RawL2TransactionWithAddressMapping
) {
  await Promise.all(
    txWithAddressMapping.addresses.data.map(async (item) => {
      const ethAddress: HexString = item.eth_address;
      const godwokenShortAddress: HexString = item.gw_short_address;

      if (!ethTxData.includes(godwokenShortAddress.slice(2))) {
        console.log(
          `illegal address mapping, since godwoken_short_address ${godwokenShortAddress} is not in the ethTxData. expected addresses: ${JSON.stringify(
            ethTxData,
            null,
            2
          )}`
        );
        return;
      }

      try {
        const exists = await query.accounts.exists(
          ethAddress,
          godwokenShortAddress
        );
        if (exists) {
          console.log(
            `abort saving, since godwoken_short_address ${godwokenShortAddress} is already saved on database.`
          );
          return;
        }
        if (!isAddressMatch(ethAddress, godwokenShortAddress)) {
          throw new Error(
            `eth_address ${ethAddress} and godwoken_short_address ${godwokenShortAddress} unmatched! abort saving!`
          );
        }
        const isExistOnChain = await isShortAddressOnChain(
          rpc,
          godwokenShortAddress
        );
        if (isExistOnChain) {
          console.log(
            `abort saving, since godwoken_short_address ${godwokenShortAddress} is already on chain.`
          );
          return;
        }

        await query.accounts.save(ethAddress, godwokenShortAddress);
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
    })
  );
}

function containsAddressType(abiItem: AbiItem) {
  if (!abiItem.inputs) {
    return false;
  }

  const interestedInputs = abiItem.inputs.filter(
    (input) => input.type === "address" || input.type === "address[]"
  );

  if (interestedInputs.length === 0) {
    return false;
  }

  return true;
}

function getPolyExecRawL2TxCacheKey(serializeRawL2Transaction: string) {
  const hash = keccakFromHexString(serializeRawL2Transaction, 20).toString(
    "hex"
  );
  const key = `${POLY_RPC_KEY}_executeRawL2Transaction_${hash}`;
  return key;
}
