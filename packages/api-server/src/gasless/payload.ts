import { HexNumber, HexString } from "@ckb-lumos/base";
import { AbiCoder } from "web3-eth-abi";
const abiCoder = require("web3-eth-abi") as AbiCoder;

export interface UserOperation {
  callContract: HexString;
  callData: HexString;
  callGasLimit: HexNumber;
  verificationGasLimit: HexNumber;
  maxFeePerGas: HexNumber;
  maxPriorityFeePerGas: HexNumber;
  paymasterAndData: HexString;
}

export const USER_OPERATION_ABI_TYPE = {
  UserOperation: {
    callContract: "address",
    callData: "bytes",
    callGasLimit: "uint256",
    verificationGasLimit: "uint256",
    maxFeePerGas: "uint256",
    maxPriorityFeePerGas: "uint256",
    paymasterAndData: "bytes",
  },
};

export function decodeGaslessPayload(data: HexString): UserOperation {
  const encoded = abiCoder.decodeParameter(USER_OPERATION_ABI_TYPE, data);
  const op: UserOperation = {
    callContract: encoded.callContract,
    callData: encoded.callData,
    callGasLimit: "0x" + BigInt(encoded.callGasLimit).toString(16),
    verificationGasLimit:
      "0x" + BigInt(encoded.verificationGasLimit).toString(16),
    maxFeePerGas: "0x" + BigInt(encoded.maxFeePerGas).toString(16),
    maxPriorityFeePerGas:
      "0x" + BigInt(encoded.maxPriorityFeePerGas).toString(16),
    paymasterAndData: encoded.paymasterAndData,
  };
  return op;
}

export function encodeGaslessPayload(op: UserOperation): HexString {
  const data = abiCoder.encodeParameter(USER_OPERATION_ABI_TYPE, op);
  return data;
}
