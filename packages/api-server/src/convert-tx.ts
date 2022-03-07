import { Hash, HexNumber, HexString } from "@ckb-lumos/base";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { rlp } from "ethereumjs-util";
import keccak256 from "keccak256";
import * as secp256k1 from "secp256k1";
import { ethAddressToAccountId } from "./base/address";
import { envConfig } from "./base/env-config";

export const EMPTY_ETH_ADDRESS = "0x" + "00".repeat(20);

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

export interface GodwokenL2Transaction {
  raw: GodwokenRawL2Transaction;
  signature: HexString;
}

export interface GodwokenRawL2Transaction {
  from_id: HexNumber;
  to_id: HexNumber;
  nonce: HexNumber;
  args: HexString;
}

function logger(level: string, ...messages: any[]) {
  console.log(`[${level}] `, ...messages);
}

function debugLogger(...messages: any[]) {
  if (process.env.DEBUG_LOG === "true") {
    logger("debug", "@convert-tx:", ...messages);
  }
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
): Promise<GodwokenL2Transaction> {
  debugLogger("origin data:", data);
  const polyjuiceTx: PolyjuiceTransaction = decodeRawTransactionData(data);
  debugLogger("decoded polyjuice tx:", polyjuiceTx);
  const godwokenTx = await parseRawTransactionData(polyjuiceTx, rpc);
  return godwokenTx;
}

function decodeRawTransactionData(dataParams: HexString) {
  const result: Buffer[] = rlp.decode(dataParams) as Buffer[];
  const resultHex = result.map((r) => "0x" + Buffer.from(r).toString("hex"));

  if (result.length !== 9) {
    throw new Error("decode raw transaction data error");
  }

  const [nonce, gasPrice, gasLimit, to, value, data, v, r, s] = resultHex;

  const tx: PolyjuiceTransaction = {
    nonce,
    gasPrice,
    gasLimit,
    to,
    value,
    data,
    v,
    r,
    s,
  };

  return tx;
}

function numberToRlpEncode(num: HexString) {
  if (num === "0x0" || num === "0x") {
    return "0x";
  }

  return "0x" + BigInt(num).toString(16);
}

function calcMessage(tx: PolyjuiceTransaction): HexString {
  let vInt = +tx.v;
  let finalVInt = undefined;
  if (vInt % 2 === 0) {
    finalVInt = "0x" + BigInt((vInt - 36) / 2).toString(16);
  } else {
    finalVInt = "0x" + BigInt((vInt - 35) / 2).toString(16);
  }

  const rawTx: PolyjuiceTransaction = {
    ...tx,
    nonce: numberToRlpEncode(tx.nonce),
    gasPrice: numberToRlpEncode(tx.gasPrice),
    gasLimit: numberToRlpEncode(tx.gasLimit),
    value: numberToRlpEncode(tx.value),
    r: "0x",
    s: "0x",
    v: numberToRlpEncode(finalVInt),
  };

  const encoded = encodePolyjuiceTransaction(rawTx);

  const message =
    "0x" + keccak256(Buffer.from(encoded.slice(2), "hex")).toString("hex");

  return message;
}

function encodePolyjuiceTransaction(tx: PolyjuiceTransaction) {
  const { nonce, gasPrice, gasLimit, to, value, data, v, r, s } = tx;

  const beforeEncode = [nonce, gasPrice, gasLimit, to, value, data, v, r, s];

  const result = rlp.encode(beforeEncode);
  return "0x" + result.toString("hex");
}

async function parseRawTransactionData(
  rawTx: PolyjuiceTransaction,
  rpc: GodwokenClient
) {
  const {
    nonce,
    gasPrice,
    gasLimit,
    to: toA,
    value,
    data,
    v,
    r: rA,
    s: sA,
  } = rawTx;
  const r = "0x" + rA.slice(2).padStart(64, "0");
  const s = "0x" + sA.slice(2).padStart(64, "0");

  let real_v = "0x00";
  if (+v % 2 === 0) {
    real_v = "0x01";
  }

  const to = toA === "0x" ? EMPTY_ETH_ADDRESS : toA;

  const signature = r + s.slice(2) + real_v.slice(2);

  const message = calcMessage(rawTx);

  const publicKey = recoverPublicKey(signature, message);
  const fromEthAddress = publicKeyToEthAddress(publicKey);
  const fromId: HexNumber | undefined = await getAccountIdByEthAddress(
    fromEthAddress,
    rpc
  );

  if (fromId == null) {
    throw new Error("from id not found!");
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
  if (to === EMPTY_ETH_ADDRESS) {
    args_7 = "0x03";
    toId = "0x" + BigInt(envConfig.creatorAccountId).toString(16);
  } else {
    args_7 = "0x00";
    toId = await getAccountIdByEthAddress(to, rpc);
  }

  if (toId == null) {
    throw new Error(`to id not found by address: ${toA}`);
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

  const godwokenRawL2Tx: GodwokenRawL2Transaction = {
    from_id: fromId,
    to_id: toId,
    nonce: nonce === "0x" ? "0x0" : nonce,
    args,
  };

  const godwokenL2Tx: GodwokenL2Transaction = {
    raw: godwokenRawL2Tx,
    signature,
  };

  return godwokenL2Tx;
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

  debugLogger("recovered public key:", publicKeyHex);

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
