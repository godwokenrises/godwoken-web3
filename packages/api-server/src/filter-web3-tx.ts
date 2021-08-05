import { HexString } from "@ckb-lumos/base";
import { Script } from "@ckb-lumos/base";
import { Hash, HexNumber } from "@ckb-lumos/base";
import {
  HexU32,
  U32,
  L2Transaction,
  L2TransactionReceipt,
  GodwokenClient,
  schemas,
} from "@godwoken-web3/godwoken";
import { Reader } from "ckb-js-toolkit";
import { envConfig } from "./base/env-config";
import { EthTransaction, EthTransactionReceipt } from "./base/types/api";
import { Uint128, Uint32, Uint64 } from "./base/types/uint";
import { PolyjuiceSystemLog, PolyjuiceUserLog } from "./base/types/gw-log";

const CKB_SUDT_ACCOUNT_ID: U32 = 1;

const EMPTY_ADDRESS = "0x" + "00".repeat(20);

const GW_LOG_POLYJUICE_SYSTEM = "0x2";
const GW_LOG_POLYJUICE_USER = "0x3";

const PENDING_BLOCK_HASH = "0x" + "00".repeat(32);
const PENDING_BLOCK_NUMBER = "0x0";
const PENDING_TRANSACTION_INDEX = "0x0";

const DEFAULT_LOGS_BLOOM = "0x" + "00".repeat(256);

export async function filterWeb3Transaction(
  txHash: Hash,
  rpc: GodwokenClient,
  l2Tx: L2Transaction,
  l2TxReceipt?: undefined
): Promise<[EthTransaction, undefined] | undefined>;

export async function filterWeb3Transaction(
  txHash: Hash,
  rpc: GodwokenClient,
  l2Tx: L2Transaction,
  l2TxReceipt: L2TransactionReceipt
): Promise<[EthTransaction, EthTransactionReceipt] | undefined>;

export async function filterWeb3Transaction(
  txHash: Hash,
  rpc: GodwokenClient,
  l2Tx: L2Transaction,
  l2TxReceipt?: L2TransactionReceipt
): Promise<[EthTransaction, EthTransactionReceipt | undefined] | undefined> {
  const fromId: U32 = +l2Tx.raw.from_id;
  const fromScriptHash: Hash | undefined = await rpc.getScriptHash(fromId);
  if (fromScriptHash == null) {
    return undefined;
  }
  const fromScript: Script | undefined = await rpc.getScript(fromScriptHash);
  if (fromScript == null) {
    return undefined;
  }

  if (fromScript.code_hash !== envConfig.ethAccountLockHash) {
    return undefined;
  }

  const fromScriptArgs: HexString = fromScript.args;
  if (
    fromScriptArgs.length !== 52 ||
    fromScriptArgs.slice(0, 66) !== envConfig.rollupTypeHash
  ) {
    console.error("Wrong from_address's script args:", fromScriptArgs);
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

  if (toScript.code_hash === envConfig.polyjuiceValidatorTypeHash) {
    const l2TxArgs: HexNumber = l2Tx.raw.args;
    const polyjuiceArgs = decodePolyjuiceArgs(l2TxArgs);

    let toAddress: HexString | undefined;
    // let polyjuiceChainId: HexNumber | undefined;
    if (polyjuiceArgs.isCreate) {
      // polyjuiceChainId = toIdHex;
    } else {
      toAddress = accountIdToEthAddress(toScriptHash, toId);
      // 32..36 bytes
      // const data = "0x" + toScript.args.slice(66, 74);
      // polyjuiceChainId = "0x" + readUInt32LE(data).toString(16);
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
      hash: txHash,
      input,
      nonce,
      to: toAddress || null,
      value: polyjuiceArgs.value,
      v: v.toHex(),
      r,
      s,
    };

    if (l2TxReceipt == null) {
      return [ethTx, undefined];
    }

    // receipt info
    const polyjuiceSystemLog = l2TxReceipt.logs.find(
      (log) => log.service_flag === GW_LOG_POLYJUICE_SYSTEM
    );
    if (polyjuiceSystemLog == null) {
      throw new Error("No system log found!");
    }
    const logInfo = parsePolyjuiceSystemLog(polyjuiceSystemLog.data);

    let contractAddress = undefined;
    if (polyjuiceArgs.isCreate && logInfo.createdAddress !== EMPTY_ADDRESS) {
      contractAddress = logInfo.createdAddress;
    }

    const txGasUsed = logInfo.gasUsed;
    // or cumulativeGasUsed ?
    const cumulativeGasUsed = txGasUsed;

    const web3Logs = l2TxReceipt.logs
      .filter((log) => log.service_flag === GW_LOG_POLYJUICE_USER)
      .map((log, index) => {
        const info = parsePolyjuiceUserLog(log.data);
        return {
          address: info.address,
          data: info.data,
          logIndex: new Uint32(index).toHex(),
          topics: info.topics,
        };
      });

    const receipt: EthTransactionReceipt = {
      transactionHash: txHash,
      transactionIndex: PENDING_TRANSACTION_INDEX,
      blockHash: PENDING_BLOCK_HASH,
      blockNumber: PENDING_BLOCK_NUMBER,
      from: fromAddress,
      to: toAddress || null,
      gasUsed: txGasUsed,
      cumulativeGasUsed: cumulativeGasUsed,
      logsBloom: DEFAULT_LOGS_BLOOM,
      logs: web3Logs.map((log) => {
        return {
          ...log,
          blockHash: PENDING_BLOCK_HASH,
          blockNumber: PENDING_BLOCK_NUMBER,
          transactionIndex: PENDING_TRANSACTION_INDEX,
          transactionHash: txHash,
          removed: false,
        };
      }),
      contractAddress: contractAddress || null,
      status: "0x1",
    };

    return [ethTx, receipt];
  } else if (
    toId === CKB_SUDT_ACCOUNT_ID &&
    toScript.code_hash === envConfig.l2SudtValidatorScriptTypeHash
  ) {
    const sudtArgs = new schemas.SUDTArgs(new Reader(l2Tx.raw.args));
    if (sudtArgs.unionType() === "SUDTTransfer") {
      const sudtTransfer: schemas.SUDTTransfer = sudtArgs.value();
      const toAddress = new Reader(sudtTransfer.getTo().raw()).serializeJson();
      if (toAddress.length !== 42) {
        return undefined;
      }
      const amount = Uint128.fromLittleEndian(
        new Reader(sudtTransfer.getAmount().raw()).serializeJson()
      );
      const fee = Uint128.fromLittleEndian(
        new Reader(sudtTransfer.getFee().raw()).serializeJson()
      );
      const value: Uint128 = amount;
      const gasPrice: Uint128 = new Uint128(1n);
      const gasLimit: Uint128 = fee;

      const ethTx: EthTransaction = {
        blockHash: PENDING_BLOCK_HASH,
        blockNumber: PENDING_BLOCK_NUMBER,
        transactionIndex: PENDING_TRANSACTION_INDEX,
        from: fromAddress,
        gas: gasLimit.toHex(),
        gasPrice: gasPrice.toHex(),
        hash: txHash,
        input: "0x",
        nonce,
        to: toAddress,
        value: value.toHex(),
        v: v.toHex(),
        r,
        s,
      };

      const receipt: EthTransactionReceipt = {
        transactionHash: txHash,
        transactionIndex: PENDING_TRANSACTION_INDEX,
        blockHash: PENDING_BLOCK_HASH,
        blockNumber: PENDING_BLOCK_NUMBER,
        from: fromAddress,
        to: toAddress,
        gasUsed: gasLimit.toHex(),
        cumulativeGasUsed: gasLimit.toHex(),
        logsBloom: DEFAULT_LOGS_BLOOM,
        logs: [],
        contractAddress: null,
        status: "0x1",
      };

      return [ethTx, receipt];
    }
  }

  return undefined;
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

function accountIdToEthAddress(accountScriptHash: Hash, id: U32): HexString {
  return (
    "0x" +
    accountScriptHash.slice(2, 34) +
    new Uint32(id).toLittleEndian().slice(2)
  );
}

function parsePolyjuiceSystemLog(data: HexString): PolyjuiceSystemLog {
  // 2 + (8 + 8 + 20 + 4) * 2
  if (data.length !== 82) {
    throw new Error(`invalid system log raw data length: ${data.length}`);
  }

  const dataWithoutPrefix = data.slice(2);

  // 0..8 bytes
  const gasUsed: Uint64 = Uint64.fromLittleEndian(
    "0x" + dataWithoutPrefix.slice(0, 16)
  );
  // 8..16 bytes
  const cumulativeGasUsed: Uint64 = Uint64.fromLittleEndian(
    "0x" + dataWithoutPrefix.slice(16, 32)
  );
  // 16..36 bytes
  const createdAddress = "0x" + dataWithoutPrefix.slice(32, 72);
  // 36..40 bytes
  const statusCode = Uint32.fromLittleEndian(
    "0x" + dataWithoutPrefix.slice(72, 80)
  ).toHex();

  return {
    gasUsed: gasUsed.toHex(),
    cumulativeGasUsed: cumulativeGasUsed.toHex(),
    createdAddress,
    statusCode,
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
