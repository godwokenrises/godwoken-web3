import { env } from "process";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

export const envConfig = {
  databaseUrl: getRequired("DATABASE_URL"),
  ethAccountLockHash: getRequired("ETH_ACCOUNT_LOCK_HASH"),
  rollupTypeHash: getRequired("ROLLUP_TYPE_HASH"),
  godwokenJsonRpc: getRequired("GODWOKEN_JSON_RPC"),
  creatorAccountId: getRequired("CREATOR_ACCOUNT_ID"),
  chainId: getRequired("CHAIN_ID"),
  defaultFromAddress: getRequired("DEFAULT_FROM_ADDRESS"),
  polyjuiceValidatorTypeHash: getOptional("POLYJUICE_VALIDATOR_TYPE_HASH"),
  rollupConfigHash: getOptional("ROLLUP_CONFIG_HASH"),
};

function getRequired(name: string): string {
  const value = env[name];
  if (value == null) {
    throw new Error(`no env ${name} provided`);
  }

  return value;
}

function getOptional(name: string): string | undefined {
  return env[name];
}
