import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import {
  GodwokenClient,
  L2Transaction,
  RawL2Transaction,
} from "@godwoken-web3/godwoken";
import { rlp } from "ethereumjs-util";
import keccak256 from "keccak256";
import * as secp256k1 from "secp256k1";
import {
  ethAddressToAccountId,
  ethEoaAddressToScriptHash,
} from "./base/address";
import { gwConfig } from "./base";
import { logger } from "./base/logger";
import {
  MAX_TRANSACTION_SIZE,
  COMPATIBLE_DOCS_URL,
  AUTO_CREATE_ACCOUNT_FROM_ID,
} from "./methods/constant";
import {
  checkBalance,
  verifyEnoughBalance,
  verifyGasLimit,
  verifyGasPrice,
  verifyIntrinsicGas,
} from "./methods/validator";
import { AUTO_CREATE_ACCOUNT_PREFIX_KEY } from "./cache/constant";
import { EthTransaction } from "./base/types/api";
import { bumpHash, PENDING_TRANSACTION_INDEX } from "./filter-web3-tx";
import { Uint64 } from "./base/types/uint";
import { AutoCreateAccountCacheValue } from "./cache/types";

export const DEPLOY_TO_ADDRESS = "0x";

export interface PolyjuiceTransaction {
  nonce: HexNumber;
  gasPrice: HexNumber;
  gasLimit: HexNumber;
  to: HexString;
  value: HexNumber;
  data: HexString;
  v: HexNumber;
  r: HexString;
  s: HexString;
}

export function polyjuiceRawTransactionToApiTransaction(
  rawTx: HexString,
  ethTxHash: Hash,
  tipBlockHash: Hash,
  tipBlockNumber: bigint,
  fromEthAddress: HexString
): EthTransaction {
  const tx: PolyjuiceTransaction = decodeRawTransactionData(rawTx);

  const pendingBlockHash = bumpHash(tipBlockHash);
  const pendingBlockNumber = new Uint64(tipBlockNumber + 1n).toHex();
  return {
    hash: ethTxHash,
    blockHash: pendingBlockHash,
    blockNumber: pendingBlockNumber,
    transactionIndex: PENDING_TRANSACTION_INDEX,
    from: fromEthAddress,
    to: tx.to == "0x" ? null : tx.to,
    gas: tx.gasLimit === "0x" ? "0x0" : "0x" + BigInt(tx.gasLimit).toString(16),
    gasPrice: tx.gasPrice === "0x" ? "0x0" : tx.gasPrice,
    input: tx.data,
    nonce: tx.nonce === "0x" ? "0x0" : tx.nonce,
    value: tx.value === "0x" ? "0x0" : tx.value,
    v: +tx.v % 2 === 0 ? "0x1" : "0x0",
    r: tx.r,
    s: tx.s,
  };
}

export function calcEthTxHash(encodedSignedTx: HexString): Hash {
  const ethTxHash =
    "0x" +
    keccak256(Buffer.from(encodedSignedTx.slice(2), "hex")).toString("hex");
  return ethTxHash;
}

export async function generateRawTransaction(
  data: HexString,
  rpc: GodwokenClient
): Promise<[L2Transaction, [string, string] | undefined]> {
  logger.debug("convert-tx, origin data:", data);
  const polyjuiceTx: PolyjuiceTransaction = decodeRawTransactionData(data);
  logger.debug("convert-tx, decoded polyjuice tx:", polyjuiceTx);
  const [godwokenTx, cacheKeyAndValue] = await parseRawTransactionData(
    polyjuiceTx,
    rpc,
    data
  );
  return [godwokenTx, cacheKeyAndValue];
}

export function decodeRawTransactionData(
  dataParams: HexString
): PolyjuiceTransaction {
  const result: Buffer[] = rlp.decode(dataParams) as Buffer[];
  // todo: r might be "0x" which cause inconvenient for down-stream
  const resultHex = result.map((r) => "0x" + Buffer.from(r).toString("hex"));

  if (result.length !== 9) {
    throw new Error("decode raw transaction data error");
  }

  const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = resultHex;

  // r & s is integer in RLP, convert to 32-byte hex string (add leading zeros)
  const rWithLeadingZeros: HexString = "0x" + r.slice(2).padStart(64, "0");
  const sWithLeadingZeros: HexString = "0x" + s.slice(2).padStart(64, "0");
  const tx: PolyjuiceTransaction = {
    nonce,
    gasPrice,
    gasLimit,
    to,
    value,
    data,
    v,
    r: rWithLeadingZeros,
    s: sWithLeadingZeros,
  };

  return tx;
}

export function getSignature(tx: PolyjuiceTransaction): HexString {
  const realVWithoutPrefix = +tx.v % 2 === 0 ? "01" : "00";
  return "0x" + tx.r.slice(2) + tx.s.slice(2) + realVWithoutPrefix;
}

export function recoverEthAddressFromPolyjuiceTx(
  rawTx: PolyjuiceTransaction
): HexString {
  const signature: HexString = getSignature(rawTx);

  const message = calcMessage(rawTx);

  const publicKey = recoverPublicKey(signature, message);
  const fromEthAddress = publicKeyToEthAddress(publicKey);
  return fromEthAddress;
}

// https://eips.ethereum.org/EIPS/eip-155
// For non eip-155 txs, (nonce, gasprice, startgas, to, value, data)
// For eip155 txs, (nonce, gasprice, startgas, to, value, data, chainid, 0, 0)
function calcMessage(tx: PolyjuiceTransaction): HexString {
  const v: bigint = BigInt(tx.v);

  const beforeEncode: any[] = [
    toRlpNumber(tx.nonce),
    toRlpNumber(tx.gasPrice),
    toRlpNumber(tx.gasLimit),
    tx.to,
    toRlpNumber(tx.value),
    tx.data,
  ];

  // if v = 27 / 28, it's non eip-155 txs
  if (v !== 27n && v !== 28n) {
    let chainId: bigint;
    if (v % 2n === 0n) {
      chainId = (v - 36n) / 2n;
    } else {
      chainId = (v - 35n) / 2n;
    }

    // chain id
    beforeEncode.push(chainId);
    // r
    beforeEncode.push(0);
    // s
    beforeEncode.push(0);
  }

  const encoded: Buffer = rlp.encode(beforeEncode);

  const message = "0x" + keccak256(encoded).toString("hex");

  return message;
}

function toRlpNumber(num: HexNumber): bigint {
  return num === "0x" ? 0n : BigInt(num);
}

function encodePolyjuiceTransaction(tx: PolyjuiceTransaction) {
  const { nonce, gasPrice, gasLimit, to, value, data, v, r, s } = tx;

  const beforeEncode = [
    toRlpNumber(nonce),
    toRlpNumber(gasPrice),
    toRlpNumber(gasLimit),
    to,
    toRlpNumber(value),
    data,
    toRlpNumber(v),
    toRlpNumber(r),
    toRlpNumber(s),
  ];

  const result = rlp.encode(beforeEncode);
  return "0x" + result.toString("hex");
}

export async function parseRawTransactionData(
  rawTx: PolyjuiceTransaction,
  rpc: GodwokenClient,
  polyjuiceRawTx: HexString
): Promise<[L2Transaction, [string, string] | undefined]> {
  const { nonce, gasPrice, gasLimit, to, value, data, v } = rawTx;

  // Reject transactions with too large size
  const rlpEncoded = encodePolyjuiceTransaction(rawTx);
  const rlpEncodedSize = Buffer.from(rlpEncoded.slice(2), "hex").length;
  if (rlpEncodedSize > MAX_TRANSACTION_SIZE) {
    throw new Error(
      `oversized data, MAX_TRANSACTION_SIZE: ${MAX_TRANSACTION_SIZE}`
    );
  }

  const gasLimitErr = verifyGasLimit(gasLimit === "0x" ? "0x0" : gasLimit, 0);
  if (gasLimitErr) {
    throw gasLimitErr.padContext(
      `eth_sendRawTransaction ${parseRawTransactionData.name}`
    );
  }

  const gasPriceErr = verifyGasPrice(gasPrice === "0x" ? "0x0" : gasPrice, 0);
  if (gasPriceErr) {
    throw gasPriceErr.padContext(
      `eth_sendRawTransaction ${parseRawTransactionData.name}`
    );
  }

  const signature: HexString = getSignature(rawTx);

  const message = calcMessage(rawTx);

  const publicKey = recoverPublicKey(signature, message);
  const fromEthAddress = publicKeyToEthAddress(publicKey);
  let fromId: HexNumber | undefined = await getAccountIdByEthAddress(
    fromEthAddress,
    rpc
  );

  let cacheKeyAndValue: [string, string] | undefined;
  // auto create account
  if (fromId == null) {
    const ethTxHash = calcEthTxHash(rlpEncoded);
    const { balance, requiredBalance } = await checkBalance(
      rpc,
      fromEthAddress,
      value,
      gasLimit,
      gasPrice
    );
    logger.info(
      `aca tx: action: send, address: ${fromEthAddress}, eth_tx_hash: ${ethTxHash}, balance: ${balance}, required_balance: ${requiredBalance}`
    );
    if (balance < requiredBalance) {
      throw new Error(
        `insufficient balance of ${fromEthAddress}, require ${requiredBalance}, got ${balance}`
      );
    }
    const key = autoCreateAccountCacheKey(ethTxHash);
    const cacheValue: AutoCreateAccountCacheValue = {
      tx: polyjuiceRawTx,
      fromAddress: fromEthAddress,
    };
    cacheKeyAndValue = [key, JSON.stringify(cacheValue)];

    fromId = AUTO_CREATE_ACCOUNT_FROM_ID;
  }

  // check intrinsic gas and enough fund
  const intrinsicGasErr = verifyIntrinsicGas(
    to,
    data,
    gasLimit === "0x" ? "0x0" : gasLimit,
    0
  );
  if (intrinsicGasErr) {
    throw intrinsicGasErr.padContext(
      `eth_sendRawTransaction ${parseRawTransactionData.name}`
    );
  }

  const enoughBalanceErr = await verifyEnoughBalance(
    rpc,
    fromEthAddress,
    value === "0x" ? "0x0" : value,
    gasLimit === "0x" ? "0x0" : gasLimit,
    gasPrice === "0x" ? "0x0" : gasPrice,
    0
  );
  if (enoughBalanceErr) {
    throw enoughBalanceErr.padContext(
      `eth_sendRawTransaction ${parseRawTransactionData.name}`
    );
  }

  // header
  const args_0_7 =
    "0x" +
    Buffer.from("FFFFFF", "hex").toString("hex") +
    Buffer.from("POLY", "utf8").toString("hex");
  // gas limit
  const args_8_16 = UInt64ToLeBytes(BigInt(gasLimit));
  // gas price
  const args_16_32 = UInt128ToLeBytes(
    gasPrice === "0x" ? BigInt(0) : BigInt(gasPrice)
  );
  // value
  const args_32_48 = UInt128ToLeBytes(
    value === "0x" ? BigInt(0) : BigInt(value)
  );

  const dataByteLength = Buffer.from(data.slice(2), "hex").length;
  // data length
  const args_48_52 = UInt32ToLeBytes(dataByteLength);
  // data
  const args_data = data;

  let args_7 = "";
  let toId: HexNumber | undefined;
  if (to === DEPLOY_TO_ADDRESS) {
    args_7 = "0x03";
    toId = gwConfig.accounts.polyjuiceCreator.id;
  } else {
    args_7 = "0x00";
    toId = await getAccountIdByEthAddress(to, rpc);
  }

  if (toId == null) {
    throw new Error(`to id not found by address: ${to}`);
  }

  // disable to address is eoa case
  const toScriptHash = await rpc.getScriptHash(Number(toId));
  const eoaScriptHash = ethEoaAddressToScriptHash(to);
  if (toScriptHash === eoaScriptHash) {
    throw new Error(
      `to_address can not be EOA address! more info: ${COMPATIBLE_DOCS_URL}`
    );
  }

  const args =
    "0x" +
    args_0_7.slice(2) +
    args_7.slice(2) +
    args_8_16.slice(2) +
    args_16_32.slice(2) +
    args_32_48.slice(2) +
    args_48_52.slice(2) +
    args_data.slice(2);

  let chainId = gwConfig.web3ChainId;
  // When `v = 27` or `v = 28`, the transaction is considered a non-eip155 transaction.
  if (v === "0x1b" || v === "0x1c") {
    chainId = "0x0";
  }
  const godwokenRawL2Tx: RawL2Transaction = {
    chain_id: chainId,
    from_id: fromId,
    to_id: toId,
    nonce: nonce === "0x" ? "0x0" : nonce,
    args,
  };

  const godwokenL2Tx: L2Transaction = {
    raw: godwokenRawL2Tx,
    signature,
  };

  return [godwokenL2Tx, cacheKeyAndValue];
}

async function getAccountIdByEthAddress(
  to: HexString,
  rpc: GodwokenClient
): Promise<HexNumber | undefined> {
  const id: number | undefined = await ethAddressToAccountId(to, rpc);
  if (id == null) {
    return undefined;
  }
  return "0x" + id.toString(16);
}

function UInt32ToLeBytes(num: number): HexString {
  const buf = Buffer.allocUnsafe(4);
  buf.writeUInt32LE(+num, 0);
  return "0x" + buf.toString("hex");
}

function UInt64ToLeBytes(num: bigint): HexString {
  num = BigInt(num);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(num);
  return `0x${buf.toString("hex")}`;
}

const U128_MIN = BigInt(0);
const U128_MAX = BigInt(2) ** BigInt(128) - BigInt(1);
function UInt128ToLeBytes(u128: bigint): HexString {
  if (u128 < U128_MIN) {
    throw new Error(`u128 ${u128} too small`);
  }
  if (u128 > U128_MAX) {
    throw new Error(`u128 ${u128} too large`);
  }
  const buf = Buffer.alloc(16);
  buf.writeBigUInt64LE(u128 & BigInt("0xFFFFFFFFFFFFFFFF"), 0);
  buf.writeBigUInt64LE(u128 >> BigInt(64), 8);
  return "0x" + buf.toString("hex");
}

function recoverPublicKey(signature: HexString, message: HexString) {
  const sigBuffer = Buffer.from(signature.slice(2), "hex");
  const msgBuffer = Buffer.from(message.slice(2), "hex");
  const recoverId = sigBuffer[64];
  const publicKey = secp256k1.ecdsaRecover(
    sigBuffer.slice(0, -1),
    recoverId,
    msgBuffer,
    false
  );
  const publicKeyHex = "0x" + Buffer.from(publicKey).toString("hex");

  logger.debug("recovered public key:", publicKeyHex);

  return publicKeyHex;
}

function publicKeyToEthAddress(publicKey: HexString): HexString {
  const ethAddress =
    "0x" +
    keccak256(Buffer.from(publicKey.slice(4), "hex"))
      .slice(12)
      .toString("hex");
  return ethAddress;
}

export function autoCreateAccountCacheKey(ethTxHash: string) {
  return `${AUTO_CREATE_ACCOUNT_PREFIX_KEY}:${ethTxHash}`;
}
