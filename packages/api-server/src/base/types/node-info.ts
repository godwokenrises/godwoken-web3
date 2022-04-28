import { HexNumber, HexString, Script } from "@ckb-lumos/base";
import {
  EoaScriptType,
  BackendType,
  NodeMode,
  GwScriptType,
} from "@godwoken-web3/godwoken";

export interface EoaScript {
  typeHash: HexString;
  eoaType: EoaScriptType;
}

export interface BackendInfo {
  validatorCodeHash: HexString;
  generatorCodeHash: HexString;
  validatorScriptTypeHash: HexString;
  backendType: BackendType;
}

export interface GwScript {
  typeHash: HexString;
  script: Script;
  scriptType: GwScriptType;
}

export interface RollupCell {
  typeHash: HexString;
  typeScript: Script;
}

export interface RollupConfig {
  requiredStakingCapacity: HexNumber;
  challengeMaturityBlocks: HexNumber;
  finalityBlocks: HexNumber;
  rewardBurnRate: HexNumber;
  chainId: HexNumber;
}
export interface NodeInfo {
  backends: Array<BackendInfo>;
  eoaScripts: Array<EoaScript>;
  gwScripts: Array<GwScript>;
  rollupCell: RollupCell;
  rollupConfig: RollupConfig;
  version: string;
  mode: NodeMode;
}
