import { HexString } from "@ckb-lumos/base";
import { Uint128, Uint32, Uint64 } from "./types/uint";

export function decodeArgs(args: HexString) {
  args = args.slice(2);
  const args_0_7 = "0x" + args.slice(0, 14);
  const args_7 = "0x" + args.slice(14, 16);
  const args_8_16 = "0x" + args.slice(16, 32);
  const args_16_32 = "0x" + args.slice(32, 64);
  const args_32_48 = "0x" + args.slice(64, 96);
  const args_48_52 = "0x" + args.slice(96, 104);
  const args_data = "0x" + args.slice(104);

  const header = Buffer.from(args_0_7.slice(8), "hex").toString("utf-8");
  const type = args_7;
  const gas_limit = Uint64.fromLittleEndian(args_8_16).toHex();
  const gas_price = Uint128.fromLittleEndian(args_16_32).toHex();
  const value = Uint128.fromLittleEndian(args_32_48).toHex();
  const data_length = Uint32.fromLittleEndian(args_48_52).toHex();
  const data = args_data;

  return { header, type, gas_limit, gas_price, value, data_length, data };
}
