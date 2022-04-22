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
    const ethAddrReg = await this.fetchEthAddrRegAccount();
    const defaultFrom = await this.fetchDefaultFromAccount();

    this.accounts ||= {
      creator,
      ethAddrReg,
      defaultFrom,
    };

    this.configEoas ||= toConfigEoas(this.nodeInfo);
    this.configGwScripts ||= toConfigGwScripts(this.nodeInfo);
    this.configBackends ||= toConfigBackends(this.nodeInfo);
    this.web3ChainId ||= this.nodeInfo.rollupConfig.chainId;
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
        `[${
          GwConfig.name
        }] can't find creator account id by script hash ${scriptHash}, script detail: ${JSON.stringify(
          script,
          null,
          2
        )}`
      );
    }
    const creatorIdHex = "0x" + BigInt(creatorId).toString(16);
    return new Account(creatorIdHex, scriptHash);
  }

  async fetchEthAddrRegAccount() {
    if (!this.nodeInfo) {
      this.nodeInfo ||= await this.rpc.getNodeInfo();
    }

    const registryScriptArgs = this.nodeInfo.rollupCell.typeHash;

    const script: Script = {
      code_hash: this.nodeInfo.backends.filter(
        (b) => b.type === BackendType.EthAddrReg
      )[0]?.validatorScriptTypeHash,
      hash_type: "type",
      args: registryScriptArgs,
    };

    const scriptHash = serializeScript(script);

    const regId = await this.rpc.getAccountIdByScriptHash(scriptHash);
    if (regId == null) {
      throw new Error(
        `[${
          GwConfig.name
        }] can't find ethAddrReg account id by script hash ${scriptHash}, script detail: ${JSON.stringify(
          script,
          null,
          2
        )}`
      );
    }
    const regIdHex = "0x" + BigInt(regId).toString(16);
    return new Account(regIdHex, scriptHash);
  }

  // we search the first account id = 2, if it is eoa account, use it, otherwise continue with id + 1;
  async fetchDefaultFromAccount() {
    if (!this.nodeInfo) {
      this.nodeInfo ||= await this.rpc.getNodeInfo();
    }

    const polyjuiceValidatorTypeHash = this.nodeInfo.backends.filter(
      (b) => b.type === BackendType.Polyjuice
    )[0]?.validatorScriptTypeHash;
    const firstEoaAccount = await findFirstEoaAccountId(
      this.rpc,
      polyjuiceValidatorTypeHash
    );
    if (firstEoaAccount == null) {
      throw new Error("can not find first eoa account.");
    }

    return firstEoaAccount;
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

const asyncSleep = async (ms = 0) => {
  return new Promise((r) => setTimeout(() => r("ok"), ms));
};

export async function findFirstEoaAccountId(
  rpc: GodwokenClient,
  polyjuiceValidatorTypeHash: HexString,
  startAccountId: number = 2,
  maxTry: number = 20
) {
  for (let id = startAccountId; id < maxTry; id++) {
    const scriptHash = await rpc.getScriptHash(id);
    if (scriptHash == null) {
      continue;
    }
    const script = await rpc.getScript(scriptHash);
    if (script == null) {
      continue;
    }

    if (script.code_hash === polyjuiceValidatorTypeHash) {
      const accountIdHex = "0x" + BigInt(id).toString(16);
      return new Account(accountIdHex, scriptHash);
    }

    await asyncSleep(500);
  }

  return null;
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

async function initGwConfig(gwConfig: GwConfig) {
  await gwConfig.init();
  console.log("initialized new GwConfig instance!");
}

export const gwConfig = new GwConfig(envConfig.godwokenJsonRpc);
initGwConfig(gwConfig);
