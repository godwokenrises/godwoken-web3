import { HexString, HexNumber } from "@ckb-lumos/base";
import { Reader } from "@ckb-lumos/toolkit";
import { schemas, L2Transaction } from "@godwoken-web3/godwoken";
import { Uint64, Uint32, Uint128 } from "./base/types/uint";

export function parseSerializeL2Transaction(
  serializedL2Tx: HexString
): L2Transaction {
  const l2tx = new schemas.L2Transaction(new Reader(serializedL2Tx));
  return DenormalizeL2Transaction(l2tx);
}

export function DenormalizeL2Transaction(l2Tx: schemas.L2Transaction) {
  return {
    raw: DenormalizeRawL2Transaction(l2Tx.getRaw()),
    signature: new Reader(l2Tx.getSignature().raw()).serializeJson(),
  };
}

export function DenormalizeRawL2Transaction(rawL2Tx: schemas.RawL2Transaction) {
  return {
    chain_id: Uint64.fromLittleEndian(
      new Reader(rawL2Tx.getChainId().raw()).serializeJson()
    ).toHex(),
    from_id: Uint32.fromLittleEndian(
      new Reader(rawL2Tx.getFromId().raw()).serializeJson()
    ).toHex(),
    to_id: Uint32.fromLittleEndian(
      new Reader(rawL2Tx.getToId().raw()).serializeJson()
    ).toHex(),
    nonce: Uint32.fromLittleEndian(
      new Reader(rawL2Tx.getNonce().raw()).serializeJson()
    ).toHex(),
    args: new Reader(rawL2Tx.getArgs().raw()).serializeJson(),
  };
}

export function isPolyjuiceTransactionArgs(polyjuiceArgs: HexString) {
  // header
  const args_0_7 =
    "0x" +
    Buffer.from("FFFFFF", "hex").toString("hex") +
    Buffer.from("POLY", "utf8").toString("hex");

  return polyjuiceArgs.slice(0, 14) !== args_0_7;
}

export function decodePolyjuiceTransactionArgs(polyjuiceArgs: HexString) {
  const input = polyjuiceArgs.slice(2);

  const isCreate = input.slice(14, 16) === "03";
  const gasLimit = LeBytesToUInt64(input.slice(16, 32));
  const gasPrice = LeBytesToUInt128(input.slice(32, 64));
  const value = LeBytesToUInt128(input.slice(64, 96));
  const dataLength = LeBytesToUInt32(input.slice(96, 104));
  const data = "0x" + input.slice(104);
  if (data.slice(2).length / 2 !== +dataLength) {
    throw new Error("invalid data length of polyjuice tx input");
  }

  return {
    isCreate,
    gasLimit,
    gasPrice,
    value,
    dataLength,
    data,
  };
}

function LeBytesToUInt32(byteStr: string): HexNumber {
  if (!byteStr.startsWith("0x")) {
    byteStr = "0x" + byteStr;
  }

  return Uint32.fromLittleEndian(byteStr).toHex();
}

function LeBytesToUInt64(byteStr: string): HexNumber {
  if (!byteStr.startsWith("0x")) {
    byteStr = "0x" + byteStr;
  }

  return Uint64.fromLittleEndian(byteStr).toHex();
}

function LeBytesToUInt128(byteStr: string): HexNumber {
  if (!byteStr.startsWith("0x")) {
    byteStr = "0x" + byteStr;
  }

  return Uint128.fromLittleEndian(byteStr).toHex();
}
