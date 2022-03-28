import { core, utils, HexNumber, Script, HexString } from "@ckb-lumos/base";
import { normalizers } from "@ckb-lumos/toolkit";
import {
  BackendInfo,
  BackendType,
  Eoa,
  EoaType,
  GodwokenClient,
  GwScript,
  GwScriptType,
  NodeInfo,
  RollupCell,
} from "@godwoken-web3/godwoken";
import { RollupConfig } from "@godwoken-web3/godwoken/schemas";
import { CKB_SUDT_ID } from "../methods/constant";
import { envConfig } from "./env-config";
import { Uint32 } from "./types/uint";

export class GwConfig {
  rpc: GodwokenClient;
  private nodeInfo: NodeInfo | undefined;

  web3ChainId: HexNumber | undefined;
  accounts: ConfigAccounts | undefined;
  configEoas: ConfigEoas | undefined;
  configBackends: ConfigBackends | undefined;
  configGwScripts: ConfigGwScripts | undefined;
  rollupConfig: RollupConfig | undefined;
  rollupCell: RollupCell | undefined;

  constructor(rpcOrUrl: GodwokenClient | string) {
    if (typeof rpcOrUrl === "string") {
      this.rpc = new GodwokenClient(rpcOrUrl);
      return;
    }

    this.rpc = rpcOrUrl;
  }

  async init() {
    this.nodeInfo ||= await this.rpc.getNodeInfo();

    const creator = await this.fetchCreatorAccount();
    // todo
    const ethAddrReg = await this.fetchCreatorAccount();
    const defaultFrom = await this.fetchCreatorAccount();

    this.accounts ||= {
      creator,
      ethAddrReg,
      defaultFrom,
    };

    this.configEoas ||= toConfigEoas(this.nodeInfo);
    this.configGwScripts ||= toConfigGwScripts(this.nodeInfo);
    this.configBackends ||= toConfigBackends(this.nodeInfo);

    const creatorId = parseInt(
      this.nodeInfo.rollupConfig.CompatibleChainId,
      16
    );
    const compatibleChainId = parseInt(
      this.nodeInfo.rollupConfig.CompatibleChainId,
      16
    );
    this.web3ChainId ||= calculateChainId(creatorId, compatibleChainId);
  }

  async fetchCreatorAccount() {
    if (!this.nodeInfo) {
      this.nodeInfo ||= await this.rpc.getNodeInfo();
    }

    const ckbSudtId = new Uint32(parseInt(CKB_SUDT_ID, 16)).toLittleEndian();

    const creatorScriptArgs =
      this.nodeInfo.rollupCell.typeHash + ckbSudtId.slice(2);

    const script: Script = {
      code_hash: this.nodeInfo.backends.filter(
        (b) => b.type === BackendType.Polyjuice
      )[0]?.validatorScriptTypeHash,
      hash_type: "type",
      args: creatorScriptArgs,
    };

    const scriptHash = serializeScript(script);

    const creatorId = await this.rpc.getAccountIdByScriptHash(scriptHash);
    if (creatorId == null) {
      throw new Error(
        `[${GwConfig.name}] can't find creator account id by script hash ${scriptHash}, script detail: ${script}`
      );
    }
    const creatorIdHex = "0x" + BigInt(creatorId).toString(16);
    return new Account(creatorIdHex, scriptHash);
  }
}

export class Account {
  id: HexNumber;
  scriptHash: HexString;

  constructor(id: HexNumber, scriptHash: HexString) {
    this.id = id;
    this.scriptHash = scriptHash;
  }
}

export interface ConfigAccounts {
  creator: Account;
  ethAddrReg: Account;
  defaultFrom: Account;
}

export interface ConfigBackends {
  sudt: Omit<BackendInfo, "type">;
  meta: Omit<BackendInfo, "type">;
  polyjuice: Omit<BackendInfo, "type">;
  ethAddrReg: Omit<BackendInfo, "type">;
}

export function toConfigBackends(nodeInfo: NodeInfo) {
  const sudt = nodeInfo.backends.filter((b) => b.type === BackendType.Sudt)[0];
  const meta = nodeInfo.backends.filter((b) => b.type === BackendType.Meta)[0];
  const polyjuice = nodeInfo.backends.filter(
    (b) => b.type === BackendType.Polyjuice
  )[0];
  const ethAddrReg = nodeInfo.backends.filter(
    (b) => b.type === BackendType.EthAddrReg
  )[0];

  const backends: ConfigBackends = {
    sudt: {
      validatorScriptHash: sudt.validatorScriptHash,
      generatorCodeHash: sudt.generatorCodeHash,
      validatorScriptTypeHash: sudt.validatorScriptTypeHash,
    },
    meta: {
      validatorScriptHash: meta.validatorScriptHash,
      generatorCodeHash: meta.generatorCodeHash,
      validatorScriptTypeHash: meta.validatorScriptTypeHash,
    },
    polyjuice: {
      validatorScriptHash: polyjuice.validatorScriptHash,
      generatorCodeHash: polyjuice.generatorCodeHash,
      validatorScriptTypeHash: polyjuice.validatorScriptTypeHash,
    },
    ethAddrReg: {
      validatorScriptHash: ethAddrReg.validatorScriptHash,
      generatorCodeHash: ethAddrReg.generatorCodeHash,
      validatorScriptTypeHash: ethAddrReg.validatorScriptTypeHash,
    },
  };
  return backends;
}

export interface ConfigGwScripts {
  deposit: Omit<GwScript, "type">;
  withdraw: Omit<GwScript, "type">;
  stateValidator: Omit<GwScript, "type">;
  stakeLock: Omit<GwScript, "type">;
  custodianLock: Omit<GwScript, "type">;
  challengeLock: Omit<GwScript, "type">;
  l1Sudt: Omit<GwScript, "type">;
  l2Sudt: Omit<GwScript, "type">;
  omniLock: Omit<GwScript, "type">;
}

export function toConfigGwScripts(nodeInfo: NodeInfo) {
  const deposit = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.Deposit
  )[0];
  const withdraw = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.Withdraw
  )[0];
  const stateValidator = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.StateValidator
  )[0];
  const stakeLock = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.StakeLock
  )[0];
  const custodianLock = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.CustodianLock
  )[0];
  const challengeLock = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.ChallengeLock
  )[0];
  const l1Sudt = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.L1Sudt
  )[0];
  const l2Sudt = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.L2Sudt
  )[0];
  const omniLock = nodeInfo.scripts.filter(
    (s) => s.type === GwScriptType.omniLock
  )[0];
  const configGwScripts: ConfigGwScripts = {
    deposit,
    withdraw,
    stateValidator,
    stakeLock,
    custodianLock,
    challengeLock,
    l1Sudt,
    l2Sudt,
    omniLock,
  };
  return configGwScripts;
}

export interface ConfigEoas {
  eth: Omit<Eoa, "type">;
  tron: Omit<Eoa, "type">;
}

export function toConfigEoas(nodeInfo: NodeInfo) {
  const eth = nodeInfo.eoas.filter((e) => e.type === EoaType.Eth)[0];
  const tron = nodeInfo.eoas.filter((e) => e.type === EoaType.Tron)[0];
  const configEoas: ConfigEoas = {
    eth,
    tron,
  };
  return configEoas;
}

export function serializeScript(script: Script) {
  return utils
    .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

export function calculateChainId(
  creatorId: number,
  compatibleChainId: number
): HexNumber {
  const chainId = (BigInt(compatibleChainId) << 32n) + BigInt(creatorId);
  console.log(
    `web3 chain_id: ${chainId}, calculating from compatible_chain_id: ${compatibleChainId}, creator_id: ${creatorId}`
  );
  return "0x" + chainId.toString(16);
}

async function initGwConfig(gwConfig: GwConfig) {
  await gwConfig.init();
  console.log("initialized new GwConfig instance!");
}

export const gwConfig = new GwConfig(envConfig.godwokenJsonRpc);
initGwConfig(gwConfig);
