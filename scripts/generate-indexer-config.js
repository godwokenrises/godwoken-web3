const dotenv = require("dotenv");
const path = require("path")
const fs = require("fs")

const envPath = path.join(__dirname, "../packages/api-server/.env")

dotenv.config({path: envPath})

const wsRpcUrl = process.argv[2];

let config = {
  l2_sudt_type_script_hash: process.env.L2_SUDT_VALIDATOR_SCRIPT_TYPE_HASH,
  polyjuice_type_script_hash: process.env.POLYJUICE_VALIDATOR_TYPE_HASH,
  rollup_type_hash: process.env.ROLLUP_TYPE_HASH,
  eth_account_lock_hash: process.env.ETH_ACCOUNT_LOCK_HASH,
  godwoken_rpc_url: process.env.GODWOKEN_JSON_RPC,
  pg_url: process.env.DATABASE_URL,
  chain_id: process.env.CHAIN_ID,
  sentry_dsn: process.env.SENTRY_DNS,
  sentry_environment: process.env.SENTRY_ENVIRONMENT,
}

if (wsRpcUrl) {
  config.ws_rpc_url = wsRpcUrl;
}

let tomlStr = "";

for (const [key, value] of Object.entries(config)) {
  console.log(`[${key}]: ${value}`)
  if(value != null && key === "chain_id"){
    tomlStr += `${key}=${Number(value)}\n`;
    continue;
  }
  if (value != null) {
    tomlStr += `${key}="${value}"\n`;
  }
}

const outputPath = path.join(__dirname, "../indexer-config.toml");
fs.writeFileSync(outputPath, tomlStr);
