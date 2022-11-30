import { envConfig } from "./env-config";
import { GwConfig } from "./gw-config";
import { CKBPriceOracle } from "../price-oracle";
import { EntryPointContract } from "../gasless/entrypoint";

export const gwConfig = new GwConfig(envConfig.godwokenJsonRpc);

export const readonlyPriceOracle = new CKBPriceOracle({ readonly: true });

export const entrypointContract = envConfig.gaslessEntrypointAddress
  ? new EntryPointContract(
      envConfig.godwokenJsonRpc,
      envConfig.gaslessEntrypointAddress
    )
  : undefined;
