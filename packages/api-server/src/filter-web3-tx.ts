import { HexString } from "@ckb-lumos/base";
import { Script } from "@ckb-lumos/base";
import { Hash, HexNumber } from "@ckb-lumos/base";
import {
  HexU32,
  U32,
  L2TransactionReceipt,
  L2Transaction,
  GodwokenClient,
} from "@godwoken-web3/godwoken";
import { EthLog, EthTransaction } from "./base/types/api";
import { Uint128, Uint32, Uint64 } from "./base/types/uint";
import { POLYJUICE_USER_LOG_FLAG } from "./methods/constant";
import { gwConfig } from "./base/index";
import { logger } from "./base/logger";
import { PolyjuiceUserLog } from "./base/types/gw-log";

// null when it's pending, https://eth.wiki/json-rpc/API
const PENDING_TRANSACTION_INDEX = null;
const PENDING_BLOCK_HASH = null;
const PENDING_BLOCK_NUMBER = null;

export async function filterEthTransaction(
  ethTxHash: Hash,
  rpc: GodwokenClient,
  l2Tx: L2Transaction
): Promise<EthTransaction | undefined> {
  const fromId: U32 = +l2Tx.raw.from_id;
  const fromScriptHash: Hash | undefined = await rpc.getScriptHash(fromId);
  if (fromScriptHash == null) {
    return undefined;
  }
  const fromScript: Script | undefined = await rpc.getScript(fromScriptHash);
  if (fromScript == null) {
    return undefined;
  }

  // skip tx with non eth_account_lock from_id
  if (fromScript.code_hash !== gwConfig.eoaScripts.eth.typeHash) {
    return undefined;
  }

  const fromScriptArgs: HexString = fromScript.args;
  if (
    fromScriptArgs.length !== 106 ||
    fromScriptArgs.slice(0, 66) !== gwConfig.rollupCell.typeHash
  ) {
    logger.error("Wrong from_address's script args:", fromScriptArgs);
    return undefined;
  }

  const fromAddress: HexString = "0x" + fromScriptArgs.slice(66);

  const toId: U32 = +l2Tx.raw.to_id;
  const toScriptHash: Hash | undefined = await rpc.getScriptHash(toId);
  if (toScriptHash == null) {
    return undefined;
  }
  const toScript: Script | undefined = await rpc.getScript(toScriptHash);
  if (toScript == null) {
    return undefined;
  }

  const signature: HexString = l2Tx.signature;
  // 0..32 bytes
  const r = "0x" + signature.slice(2, 66);
  // 32..64 bytes
  const s = "0x" + signature.slice(66, 130);
  // signature[65] byte
  const v = Uint32.fromHex("0x" + signature.slice(130, 132));

  const nonce: HexU32 = l2Tx.raw.nonce;

  if (
    toScript.code_hash === gwConfig.backends.polyjuice.validatorScriptTypeHash
  ) {
    const l2TxArgs: HexNumber = l2Tx.raw.args;
    const polyjuiceArgs = decodePolyjuiceArgs(l2TxArgs);

    let toAddress: HexString | undefined;

    if (!polyjuiceArgs.isCreate) {
      // 74 = 2 + (32 + 4) * 2
      toAddress = "0x" + toScript.args.slice(74);
    }
    // const chainId = polyjuiceChainId;
    const input = polyjuiceArgs.input || "0x";

    const ethTx: EthTransaction = {
      blockHash: PENDING_BLOCK_HASH,
      blockNumber: PENDING_BLOCK_NUMBER,
      transactionIndex: PENDING_TRANSACTION_INDEX,
      from: fromAddress,
      gas: polyjuiceArgs.gasLimit,
      gasPrice: polyjuiceArgs.gasPrice,
      hash: ethTxHash,
      input,
      nonce,
      to: toAddress || null,
      value: polyjuiceArgs.value,
      v: v.toHex(),
      r,
      s,
    };

    return ethTx;
  }

  return undefined;
}

export async function filterEthLog(
  ethTxHash: Hash,
  l2TxReceipt: L2TransactionReceipt
): Promise<EthLog[]> {
  const web3Logs = l2TxReceipt.logs
    .filter((log) => log.service_flag === POLYJUICE_USER_LOG_FLAG)
    .map((log, index) => {
      const info = parsePolyjuiceUserLog(log.data);
      return {
        address: info.address,
        data: info.data,
        logIndex: new Uint32(index).toHex(),
        topics: info.topics,
      };
    });
  return web3Logs.map((log) => {
    return {
      ...log,
      data: log.data === "0x" ? "0x" + "00".repeat(32) : log.data,
      blockHash: PENDING_BLOCK_HASH,
      blockNumber: PENDING_BLOCK_NUMBER,
      transactionIndex: PENDING_TRANSACTION_INDEX,
      transactionHash: ethTxHash,
      removed: false,
    };
  }) as EthLog[];
}

export interface PolyjuiceArgs {
  isCreate: boolean;
  gasLimit: HexNumber;
  gasPrice: HexNumber;
  value: HexNumber;
  inputSize: HexNumber;
  input: HexString;
}

function decodePolyjuiceArgs(args: HexString): PolyjuiceArgs {
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

function parsePolyjuiceUserLog(data: HexString): PolyjuiceUserLog {
  const dataWithoutPrefix = data.slice(2);

  let offset = 0;
  // 0..20 bytes
  const address = "0x" + dataWithoutPrefix.slice(offset, offset + 40);
  offset += 40;
  const dataSize: U32 = Uint32.fromLittleEndian(
    "0x" + dataWithoutPrefix.slice(offset, offset + 8)
  ).getValue();
  offset += 8;
  const logData = "0x" + dataWithoutPrefix.slice(offset, offset + dataSize * 2);
  offset += dataSize * 2;

  const topicsCount: U32 = Uint32.fromLittleEndian(
    "0x" + dataWithoutPrefix.slice(offset, offset + 8)
  ).getValue();
  offset += 8;
  const topics: Hash[] = [];
  for (let i = 0; i < topicsCount; i++) {
    const topic = "0x" + dataWithoutPrefix.slice(offset, offset + 64);
    offset += 64;
    topics.push(topic);
  }
  if (offset !== dataWithoutPrefix.length) {
    throw new Error(
      `Too many bytes for polyjuice user log data: offset=${
        offset / 2
      }, data.length=${dataWithoutPrefix.length / 2}`
    );
  }
  return {
    address,
    data: logData,
    topics,
  };
}
