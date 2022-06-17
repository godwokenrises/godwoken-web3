import { HexString, HexNumber } from "@ckb-lumos/base";
import { Reader } from "@ckb-lumos/toolkit";
import { schemas, L2Transaction } from "@godwoken-web3/godwoken";
import { Uint64, Uint32, Uint128 } from "./base/types/uint";
export interface PolyjuiceArgs {
  isCreate: boolean;
  gasLimit: HexNumber;
  gasPrice: HexNumber;
  value: HexNumber;
  inputSize: HexNumber;
  input: HexString;
}

export function isPolyjuiceTransactionArgs(polyjuiceArgs: HexString) {
  // header
  const args_0_7 =
    "0x" +
    Buffer.from("FFFFFF", "hex").toString("hex") +
    Buffer.from("POLY", "utf8").toString("hex");

  return polyjuiceArgs.slice(0, 14) !== args_0_7;
}

export function decodePolyjuiceArgs(args: HexString): PolyjuiceArgs {
  const buf = Buffer.from(args.slice(2), "hex");

  const isCreate = buf[7].toString(16) === "3";
  const gasLimit = Uint64.fromLittleEndian(
    "0x" + buf.slice(8, 16).toString("hex")
  ).toHex();
  const gasPrice = Uint128.fromLittleEndian(
    "0x" + buf.slice(16, 32).toString("hex")
  ).toHex();
  const value = Uint128.fromLittleEndian(
    "0x" + buf.slice(32, 48).toString("hex")
  ).toHex();

  const inputSize = Uint32.fromLittleEndian(
    "0x" + buf.slice(48, 52).toString("hex")
  );

  const input = "0x" + buf.slice(52, 52 + inputSize.getValue()).toString("hex");

  return {
    isCreate,
    gasLimit,
    gasPrice,
    value,
    inputSize: inputSize.toHex(),
    input,
  };
}

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
