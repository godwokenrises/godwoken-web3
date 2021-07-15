// source: https://github.com/nervosnetwork/godwoken-polyjuice/blob/main/docs/EVM-compatible.md
export const POLY_MAX_BLOCK_GAS_LIMIT = 12500000;
export const POLY_MAX_TRANSACTION_GAS_LIMIT = 12500000;
export const POLY_MIN_GAS_PRICE = 0;
export const POLY_BLOCK_DIFFICULTY = 2500000000000000;

export const DEFAULT_EMPTY_ETH_ADDRESS = `0x${"0".repeat(40)}`;

export const POLYJUICE_SYSTEM_PREFIX = 255;
export const POLYJUICE_CONTRACT_CODE = 1;
// export const POLYJUICE_DESTRUCTED = 2;
// export const GW_KEY_BYTES = 32;
export const GW_ACCOUNT_KV = 0;
export const CKB_SUDT_ID = "0x1";
export const CKB_PERSONALIZATION = "ckb-default-hash";
export const SUDT_OPERATION_LOG_FLGA = "0x0";
export const SUDT_PAY_FEE_LOG_FLAG = "0x1";
export const POLYJUICE_SYSTEM_LOG_FLAG = "0x2";
export const POLYJUICE_USER_LOG_FLAG = "0x3";

export const HEADER_NOT_FOUND_ERR_MESSAGE = "header not found";
