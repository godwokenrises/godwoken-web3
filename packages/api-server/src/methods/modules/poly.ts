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
import { isAddressMatch, isShortAddressOnChain } from "../../base/address";
import { GW_RPC_REQUEST_ERROR } from "../error-code";
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
import { LogItem } from "../types";
import { evmcCodeTypeMapping, parsePolyjuiceSystemLog } from "../gw-error";
import abiCoder, { AbiCoder } from "web3-eth-abi";
import { FailedReason } from "../../base/types/api";

export class Poly {
  private query: Query;
  private rpc: GodwokenClient;

  constructor() {
    this.query = new Query();
    this.rpc = new GodwokenClient(envConfig.godwokenJsonRpc);

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
      parseError(error);
    }
  }

  async executeRawL2Transaction(args: any[]) {
    try {
      const data = args[0];
      const txWithAddressMapping: RawL2TransactionWithAddressMapping =
        deserializeRawL2TransactionWithAddressMapping(data);
      const rawL2Tx = txWithAddressMapping.raw_tx;
      const result = await this.rpc.executeRawL2Transaction(rawL2Tx);
      // if result is fine, then tx is legal, we can start thinking to store the address mapping
      await saveAddressMapping(this.query, this.rpc, txWithAddressMapping);
      return result;
    } catch (error) {
      parseError(error);
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

function parseError(error: any): void {
  const prefix = "JSONRPCError: server error ";
  let message: string = error.message;
  if (message.startsWith(prefix)) {
    const jsonErr = message.slice(prefix.length);
    const err = JSON.parse(jsonErr);

    const last_log: LogItem | undefined = err.data?.last_log;
    if (last_log != null) {
      const polyjuiceSystemLog = parsePolyjuiceSystemLog(err.data.last_log);
      const return_data = err.data.return_data;

      let statusReason = "";
      if (return_data !== "0x") {
        const abi = abiCoder as unknown as AbiCoder;
        statusReason = abi.decodeParameter(
          "string",
          return_data.substring(10)
        ) as unknown as string;
      }

      const failedReason: FailedReason = {
        status_code: "0x" + polyjuiceSystemLog.statusCode.toString(16),
        status_type:
          evmcCodeTypeMapping[polyjuiceSystemLog.statusCode.toString()],
        message: statusReason,
      };
      const data = { failed_reason: failedReason };
      const newMessage = `${failedReason.status_type.toLowerCase()}: ${
        failedReason.message
      }`;
      throw new RpcError(err.code, newMessage, data);
    }

    throw new RpcError(err.code, err.message);
  }

  throw new RpcError(GW_RPC_REQUEST_ERROR, error.message);
}
