import { HexString } from "@ckb-lumos/base";
import { BlockParameter } from "../methods/types";

export interface FilterObject {
  address?: HexString;
  fromBlock?: BlockParameter;
  toBlock?: BlockParameter;
  topics?: HexString[];
  blockHash?: HexString;
}

export type FilterType = FilterObject | 1 | 2; // 1: block filter 2: pending transaction filter
