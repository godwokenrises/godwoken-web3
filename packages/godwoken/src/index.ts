export * as types from "./types";
export * as schemas from "../schemas";
import { HexNumber, HexString, Hash } from "@ckb-lumos/base";

export interface RunResult {
  read_values: Map<Hash, Hash>;
  write_values: Map<Hash, Hash>;
  return_data: HexString;
  account_count?: HexNumber;
  new_scripts: Map<Hash, HexString>;
  write_data: Map<Hash, HexString>;
  read_data: Map<Hash, HexNumber>;
}
