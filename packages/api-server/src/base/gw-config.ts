import { core, utils, HexNumber, Script, HexString } from "@ckb-lumos/base";
import { normalizers } from "@ckb-lumos/toolkit";
import {
  BackendInfo,
  EoaScript,
  GwScript,
  NodeInfo,
  RollupCell,
  RollupConfig,
} from "./types/node-info";
import {
  NodeMode,
  BackendType,
  EoaScriptType,
  GwScriptType,
  GodwokenClient,
  NodeInfo as GwNodeInfo,
} from "@godwoken-web3/godwoken";
import { CKB_SUDT_ID } from "../methods/constant";
import { Uint32 } from "./types/uint";
import { snakeToCamel } from "../util";

export class GwConfig {
  rpc: GodwokenClient;
  private nodeInfo: NodeInfo | undefined;

  web3ChainId: HexNumber | undefined;
  accounts: ConfigAccounts | undefined;
  eoaScripts: ConfigEoaScripts | undefined;
  backends: ConfigBackends | undefined;
  gwScripts: ConfigGwScripts | undefined;
  rollupConfig: RollupConfig | undefined;
  rollupCell: RollupCell | undefined;
  nodeMode: NodeMode | undefined;
  nodeVersion: string | undefined;

  constructor(rpcOrUrl: GodwokenClient | string) {
    if (typeof rpcOrUrl === "string") {
      this.rpc = new GodwokenClient(rpcOrUrl);
      return;
    }

    this.rpc = rpcOrUrl;
  }

  async getNodeInfo() {
    const nodeInfo = await this.rpc.getNodeInfo();
    return toApiNodeInfo(nodeInfo);
  }

  init(
    successCallback?: (gwConfig: GwConfig) => any,
    errCallBack?: (error: any) => any
  ): Promise<GwConfig> {
    return new Promise(async (resolve, reject) => {
      successCallback ||= (_gwConfig: GwConfig) => {};
      errCallBack ||= (_error: any) => {};
      try {
        this.nodeInfo ||= await this.getNodeInfo();

        const ethAddrReg = await this.fetchEthAddrRegAccount();
        const creator = await this.fetchCreatorAccount();
        const defaultFrom = await this.fetchDefaultFromAccount();

        this.accounts ||= {
          polyjuiceCreator: creator,
          ethAddrReg,
          defaultFrom,
        };

        this.eoaScripts ||= toConfigEoaScripts(this.nodeInfo);
        this.gwScripts ||= toConfigGwScripts(this.nodeInfo);
        this.backends ||= toConfigBackends(this.nodeInfo);
        this.web3ChainId ||= this.nodeInfo.rollupConfig.chainId;
        this.rollupCell ||= this.nodeInfo.rollupCell;
        this.rollupConfig ||= this.nodeInfo.rollupConfig;
        this.nodeMode = this.nodeInfo.mode;
        this.nodeVersion = this.nodeInfo.version;

        successCallback(this);
        return resolve(this);
      } catch (error: any) {
        errCallBack(error);
        reject(error.message);
      }
    });
  }

  async fetchCreatorAccount(ethAddrRegId?: HexNumber) {
    this.nodeInfo ||= await this.getNodeInfo();

    const ckbSudtId = new Uint32(parseInt(CKB_SUDT_ID, 16)).toLittleEndian();
    ethAddrRegId ||= new Uint32(
      parseInt((await this.fetchEthAddrRegAccount()).id, 16)
    ).toLittleEndian();

    const creatorScriptArgs =
      this.nodeInfo.rollupCell.typeHash +
      ckbSudtId.slice(2) +
      ethAddrRegId.slice(2);

    const polyjuiceValidatorTypeHash = this.nodeInfo.backends.find(
      (b) => b.backendType === BackendType.Polyjuice
    )?.validatorScriptTypeHash;

    if (polyjuiceValidatorTypeHash == null) {
      throw new Error(
        `[GwConfig => fetchCreatorAccount] polyjuiceValidatorTypeHash is null! ${JSON.stringify(
          this.nodeInfo.backends,
          null,
          2
        )}`
      );
    }

    const script: Script = {
      code_hash: polyjuiceValidatorTypeHash,
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
    this.nodeInfo ||= await this.getNodeInfo();

    const registryScriptArgs = this.nodeInfo.rollupCell.typeHash;

    const script: Script = {
      code_hash: this.nodeInfo.backends.filter(
        (b) => b.backendType === BackendType.EthAddrReg
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
    this.nodeInfo ||= await this.getNodeInfo();

    const ethAccountLockTypeHash = this.nodeInfo.eoaScripts.find(
      (s) => s.eoaType === EoaScriptType.Eth
    )?.typeHash;
    const firstEoaAccount = await findFirstEoaAccountId(
      this.rpc,
      ethAccountLockTypeHash!
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
  polyjuiceCreator: Account;
  ethAddrReg: Account;
  defaultFrom: Account;
}

export interface ConfigBackends {
  sudt: Omit<BackendInfo, "backendType">;
  meta: Omit<BackendInfo, "backendType">;
  polyjuice: Omit<BackendInfo, "backendType">;
  ethAddrReg: Omit<BackendInfo, "backendType">;
}

export function toConfigBackends(nodeInfo: NodeInfo) {
  const sudt = nodeInfo.backends.filter(
    (b) => b.backendType === BackendType.Sudt
  )[0];
  const meta = nodeInfo.backends.filter(
    (b) => b.backendType === BackendType.Meta
  )[0];
  const polyjuice = nodeInfo.backends.filter(
    (b) => b.backendType === BackendType.Polyjuice
  )[0];
  const ethAddrReg = nodeInfo.backends.filter(
    (b) => b.backendType === BackendType.EthAddrReg
  )[0];

  const backends: ConfigBackends = {
    sudt: {
      validatorCodeHash: sudt.validatorCodeHash,
      generatorCodeHash: sudt.generatorCodeHash,
      validatorScriptTypeHash: sudt.validatorScriptTypeHash,
    },
    meta: {
      validatorCodeHash: meta.validatorCodeHash,
      generatorCodeHash: meta.generatorCodeHash,
      validatorScriptTypeHash: meta.validatorScriptTypeHash,
    },
    polyjuice: {
      validatorCodeHash: polyjuice.validatorCodeHash,
      generatorCodeHash: polyjuice.generatorCodeHash,
      validatorScriptTypeHash: polyjuice.validatorScriptTypeHash,
    },
    ethAddrReg: {
      validatorCodeHash: ethAddrReg.validatorCodeHash,
      generatorCodeHash: ethAddrReg.generatorCodeHash,
      validatorScriptTypeHash: ethAddrReg.validatorScriptTypeHash,
    },
  };
  return backends;
}

export interface ConfigGwScripts {
  deposit: Omit<GwScript, "scriptType">;
  withdraw: Omit<GwScript, "scriptType">;
  stateValidator: Omit<GwScript, "scriptType">;
  stakeLock: Omit<GwScript, "scriptType">;
  custodianLock: Omit<GwScript, "scriptType">;
  challengeLock: Omit<GwScript, "scriptType">;
  l1Sudt: Omit<GwScript, "scriptType">;
  l2Sudt: Omit<GwScript, "scriptType">;
  omniLock: Omit<GwScript, "scriptType">;
}

export function toConfigGwScripts(nodeInfo: NodeInfo) {
  const deposit = findGwScript(GwScriptType.Deposit, nodeInfo);
  const withdraw = findGwScript(GwScriptType.Withdraw, nodeInfo);
  const stateValidator = findGwScript(GwScriptType.StateValidator, nodeInfo);
  const stakeLock = findGwScript(GwScriptType.StakeLock, nodeInfo);
  const custodianLock = findGwScript(GwScriptType.CustodianLock, nodeInfo);
  const challengeLock = findGwScript(GwScriptType.ChallengeLock, nodeInfo);
  const l1Sudt = findGwScript(GwScriptType.L1Sudt, nodeInfo);
  const l2Sudt = findGwScript(GwScriptType.L2Sudt, nodeInfo);
  const omniLock = findGwScript(GwScriptType.OmniLock, nodeInfo);

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

export function findGwScript(type: GwScriptType, nodeInfo: NodeInfo): GwScript {
  const script = nodeInfo.gwScripts.find((s) => s.scriptType === type);
  if (script == null) {
    throw new Error(`[GwConfig => findGwScript] can not find script ${type}`);
  }
  return script!;
}

export interface ConfigEoaScripts {
  eth: Omit<EoaScript, "eoaType">;
}

export function toConfigEoaScripts(nodeInfo: NodeInfo) {
  const eth = nodeInfo.eoaScripts.find((e) => e.eoaType === EoaScriptType.Eth);
  if (eth == null) {
    throw new Error("no Eth eoa script!");
  }

  const configEoas: ConfigEoaScripts = {
    eth,
  };
  return configEoas;
}

export function toApiNodeInfo(nodeInfo: GwNodeInfo): NodeInfo {
  return snakeToCamel(nodeInfo, ["code_hash", "hash_type"]);
}

export async function findFirstEoaAccountId(
  rpc: GodwokenClient,
  ethAccountLockTypeHash: HexString,
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
    if (script.code_hash === ethAccountLockTypeHash) {
      const accountIdHex = "0x" + BigInt(id).toString(16);
      return new Account(accountIdHex, scriptHash);
    }

    await asyncSleep(500);
  }

  return null;
}

export function serializeScript(script: Script) {
  return utils
    .ckbHash(core.SerializeScript(normalizers.NormalizeScript(script)))
    .serializeJson();
}

const asyncSleep = async (ms = 0) => {
  return new Promise((r) => setTimeout(() => r("ok"), ms));
};
