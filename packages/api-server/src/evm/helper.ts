import { HexString } from "@ckb-lumos/base";
import { EVM_OPCODES, PUSH0, CODECOPY } from "./opcodes";

export interface Opcode {
  code: number;
  name: string;
  fee: number;
  isAsync: boolean;
  dynamicGas: boolean;
  pc: number;
  pushData?: HexString;
  pos: number; // position in the Opcode list
}

export function getOpcodes(byteCode: Buffer | HexString): Opcode[] {
  byteCode = toBuffer(byteCode);
  const opcodes: Opcode[] = [];
  for (let pc = 0; pc < byteCode.length; pc++) {
    let pushData;

    let opcode: any = {
      code: byteCode[pc],
      name: "INVALID",
      fee: 0,
      isAsync: false,
      dynamicGas: false,
    };

    if (opcode.code in EVM_OPCODES) {
      opcode.name = (EVM_OPCODES as any)[byteCode[pc]];
    }

    if (opcode.name.startsWith("PUSH")) {
      const pushDataLength = byteCode[pc] - PUSH0;
      pushData =
        "0x" + byteCode.slice(pc + 1, pc + pushDataLength + 1).toString("hex");
      pc += pushDataLength;
    }

    const pos = opcodes.length > 0 ? opcodes.length - 1 : 0;

    opcode = { ...opcode, ...{ pushData, pc, pos } };
    opcodes.push(opcode as Opcode);
  }
  return opcodes;
}

// a function to guess runtime bytecode size from create bytecode
// note that we are not really executing the bytecode in evm for performance concern
// instead we look for CODECOPY opcode and try to get stack value from last N steps
// one of them is runtime bytecode length, and check if one exceed the limit
export function checkRuntimeBytecodeSize(
  createByteCode: Buffer | HexString,
  maxSizeLimit: number
): [Boolean, number] {
  createByteCode = toBuffer(createByteCode);
  const createByteCodeLength = createByteCode.byteLength;
  const opcodes = getOpcodes(createByteCode);
  const targetOpcodes = opcodes.filter((o) => o.name === EVM_OPCODES[CODECOPY]);
  const checkSteps = 7;

  let exceedLimit = false;
  let runtimeByteCodeSize = 0;

  for (const opcode of targetOpcodes) {
    const targetPosition = opcode.pos;
    const start = targetPosition > checkSteps ? targetPosition - checkSteps : 0;
    const values: number[] = [];

    for (let i = start; i < opcode.pos; i++) {
      const step = opcodes[i];
      if (step != null && step.pushData != null) {
        const value = +step.pushData;
        values.push(value);
      }
    }

    values.map((value) => {
      if (createByteCodeLength > value && value > maxSizeLimit) {
        exceedLimit = true;
        runtimeByteCodeSize = value;
      }
    });
  }

  return [exceedLimit, runtimeByteCodeSize];
}

export function toBuffer(byteCode: Buffer | HexString): Buffer {
  if (byteCode instanceof Buffer) {
    return byteCode;
  }

  return Buffer.from(byteCode.slice(2), "hex");
}
