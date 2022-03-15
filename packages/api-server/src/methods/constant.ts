// source: https://github.com/nervosnetwork/godwoken-polyjuice/blob/main/docs/EVM-compatible.md
export const POLY_MAX_BLOCK_GAS_LIMIT = 12500000;
export const POLY_MAX_TRANSACTION_GAS_LIMIT = 12500000;
export const POLY_MIN_GAS_PRICE = 0;
export const POLY_BLOCK_DIFFICULTY = BigInt("2500000000000000");

export const ZERO_ETH_ADDRESS = `0x${"0".repeat(40)}`;
export const DEFAULT_LOGS_BLOOM = "0x" + "00".repeat(256);

export const POLYJUICE_SYSTEM_PREFIX = 255;
export const POLYJUICE_CONTRACT_CODE = 1;
// export const POLYJUICE_DESTRUCTED = 2;
// export const GW_KEY_BYTES = 32;
export const GW_ACCOUNT_KV = 0;
export const CKB_SUDT_ID = "0x1";
export const SUDT_OPERATION_LOG_FLAG = "0x0";
export const SUDT_PAY_FEE_LOG_FLAG = "0x1";
export const POLYJUICE_SYSTEM_LOG_FLAG = "0x2";
export const POLYJUICE_USER_LOG_FLAG = "0x3";

export const HEADER_NOT_FOUND_ERR_MESSAGE = "header not found";

export const COMPATIBLE_DOCS_URL =
  "https://github.com/nervosnetwork/godwoken-web3/blob/compatibility-breaking-changes/docs/compatibility.md";

export const QUERY_OFFSET_REACHED_END = "query offset reached end";
