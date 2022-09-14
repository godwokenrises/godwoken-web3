import { HexNumber, HexString } from "@ckb-lumos/base";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { gwConfig } from "../base";
import { EthRegistryAddress } from "../base/address";
import { CKB_SUDT_ID, POLY_MAX_BLOCK_GAS_LIMIT } from "./constant";
import { TransactionCallObject } from "./types";
import {
  verifyEnoughBalance,
  verifyGasLimit,
  verifyIntrinsicGas,
} from "./validator";

export class EthNormalizer {
  private rpc: GodwokenClient;

  constructor(rpc: GodwokenClient) {
    this.rpc = rpc;
  }

  async normalizeCallTx(
    txCallObj: TransactionCallObject
  ): Promise<Required<TransactionCallObject>> {
    const value = txCallObj.value || "0x0";
    const data = txCallObj.data || "0x";
    const toAddress = txCallObj.to;
    const fromAddress =
      txCallObj.from || (await getDefaultFromAddress(this.rpc));

    // we should set default price to 0 instead of minGasPrice,
    // otherwise read operation might fail the balance check.
    const gasPrice = txCallObj.gasPrice || "0x0";

    // set default gas limit to min(maxBlockGas, userBalanceAvailableGas)
    // TODO: use real blockAvailableGas to replace POLY_MAX_BLOCK_GAS_LIMIT
    const maxBlockGasLimit =
      "0x" + BigInt(POLY_MAX_BLOCK_GAS_LIMIT).toString(16);
    let gas = txCallObj.gas;
    if (gas == null) {
      gas =
        +gasPrice === 0
          ? maxBlockGasLimit
          : min(
              maxBlockGasLimit,
              await getMaxGasByBalance(this.rpc, fromAddress, gasPrice, value)
            );
    }

    const gasLimitErr = verifyGasLimit(gas, 0);
    if (gasLimitErr) {
      throw gasLimitErr.padContext(this.normalizeCallTx.name);
    }

    const intrinsicGasErr = verifyIntrinsicGas(toAddress, data, gas, 0);
    if (intrinsicGasErr) {
      throw intrinsicGasErr.padContext(this.normalizeCallTx.name);
    }

    // check if from address have enough balance
    // when gasPrice in ethCallObj is provided.
    if (txCallObj.gasPrice != null) {
      const balanceErr = await verifyEnoughBalance(
        this.rpc,
        fromAddress,
        value,
        gas,
        gasPrice,
        0
      );
      if (balanceErr) {
        throw balanceErr.padContext(
          `${this.normalizeCallTx.name}: from account ${fromAddress}`
        );
      }
    }

    return {
      value,
      data,
      to: toAddress,
      from: fromAddress,
      gas,
      gasPrice,
    };
  }

  async normalizeEstimateGasTx(
    txEstimateGasObj: Partial<TransactionCallObject>
  ): Promise<Required<TransactionCallObject>> {
    const to = txEstimateGasObj.to || "0x";
    return this.normalizeCallTx({ ...txEstimateGasObj, to });
  }
}

async function getDefaultFromAddress(rpc: GodwokenClient): Promise<HexString> {
  const defaultFromScript = await rpc.getScript(
    gwConfig.accounts.defaultFrom.scriptHash
  );
  if (defaultFromScript == null) {
    throw new Error("default from script is null");
  }
  const defaultFromAddress = "0x" + defaultFromScript.args.slice(2).slice(64);
  return defaultFromAddress;
}

export async function getMaxGasByBalance(
  rpc: GodwokenClient,
  from: HexString,
  gasPrice: HexNumber,
  txValue: HexNumber = "0x0"
): Promise<HexNumber> {
  if (gasPrice === "0x" || gasPrice === "0x0") {
    throw new Error(`[${getMaxGasByBalance.name}] gasPrice should > 0`);
  }

  const registryAddress: EthRegistryAddress = new EthRegistryAddress(from);
  const balance = await rpc.getBalance(
    registryAddress.serialize(),
    +CKB_SUDT_ID
  );

  if (balance < BigInt(txValue)) {
    throw new Error(
      `[${getMaxGasByBalance.name}] insufficient funds for transfer`
    );
  }

  const availableBalance = balance - BigInt(txValue);
  const maxGas = availableBalance / BigInt(gasPrice);
  return "0x" + maxGas.toString(16);
}

export function min(...values: HexNumber[]): HexNumber {
  const num = values.reduce((previousValue, currentValue) =>
    BigInt(currentValue) < BigInt(previousValue) ? currentValue : previousValue
  );
  return num;
}
