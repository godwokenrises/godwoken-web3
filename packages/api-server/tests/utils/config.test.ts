import { HexString } from "@ckb-lumos/base";
import { GodwokenClient, NodeInfo } from "@godwoken-web3/godwoken";
import test from "ava";
import { gwConfig } from "../../src/base/gw-config";

let mockRpc: GodwokenClient = gwConfig.rpc;

mockRpc.getAccountIdByScriptHash = async (scriptHash: HexString) => {
  switch (scriptHash) {
    case "0x5df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921f":
      return 2;

    case "0x7df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921d":
      return 4;

    case "0xb5f81e2d10af9600194606989583ae8cc3fcb822a24fdea95f42da5ea18606da":
      return 3;

    default:
      throw new Error(
        `getAccountIdByScriptHash not mock for script hash ${scriptHash}`
      );
  }
};

mockRpc.getScriptHash = async (accountId: number) => {
  switch (accountId) {
    case 4:
      return "0x7df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921d";

    case 3:
      return "0xb5f81e2d10af9600194606989583ae8cc3fcb822a24fdea95f42da5ea18606da";

    case 2:
      return "0x5df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921f";

    default:
      throw new Error(`getScriptHash not mock for account id ${accountId}`);
  }
};

mockRpc.getScript = async (scriptHash: HexString) => {
  switch (scriptHash) {
    case "0x7df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921d":
      return {
        code_hash:
          "0x9b599c7df5d7b813f7f9542a5c8a0c12b65261a081b1dba02c2404802f772a15",
        hash_type: "type",
        args: "0x4ed4a999f0046230d67503c07f1e64f2b2ad1440f758ebfc97282be40f74673c0000001",
      };

    case "0x5df8df09ec23819836b888f575ca4154a2af1f1d4720bca91a5fc9f5f7d9921f":
      return {
        code_hash:
          "0x1272c80507fe5e6cf33cf3e5da6a5f02430de40abb14410ea0459361bf74ebe0",
        hash_type: "type",
        args: "0x4ed4a999f0046230d67503c07f1e64f2b2ad1440f758ebfc97282be40f74673c0xFb2C72d3ffe10Ef7c9960272859a23D24db9e04A",
      };

    default:
      throw new Error(`getScript not mock for scriptHash ${scriptHash}`);
  }
};

mockRpc.getNodeInfo = async () => {
  return {
    backends: [
      {
        validatorScriptHash: "",
        generatorCodeHash: "",
        validatorScriptTypeHash:
          "0x32923ebad8e5417ae072decc89774324ec4a623f57af5cee6e2901d29d8e6691",
        type: "Meta",
      },
      {
        validatorScriptHash: "",
        generatorCodeHash: "",
        validatorScriptTypeHash:
          "0x9b599c7df5d7b813f7f9542a5c8a0c12b65261a081b1dba02c2404802f772a15",
        type: "Polyjuice",
      },
      {
        validatorScriptHash: "",
        generatorCodeHash: "",
        validatorScriptTypeHash:
          "0x696447c51fdb84d0e59850b26bc431425a74daaac070f2b14f5602fbb469912a",
        type: "Sudt",
      },
      {
        validatorScriptHash: "",
        generatorCodeHash: "",
        validatorScriptTypeHash:
          "0x59ecd45fc257a761d992507ef2e1acccf43221567f6cf3b1fc6fb9352a7a0ca3",
        type: "EthAddrReg",
      },
    ],
    eoas: [
      {
        typeHash:
          "0x1272c80507fe5e6cf33cf3e5da6a5f02430de40abb14410ea0459361bf74ebe0",
        type: "Eth",
      },
    ],
    scripts: [
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "Deposit",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "Withdraw",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "StateValidator",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "StakeLock",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "CustodianLock",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "ChallengeLock",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "L1Sudt",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "L2Sudt",
      },
      {
        typeHash:
          "0xcddb997266a74a5e940a240d63ef8aa89d116999044e421dc337ead16ea870eb",
        script: {},
        type: "OmniLock",
      },
    ],
    rollupCell: {
      typeHash:
        "0x4ed4a999f0046230d67503c07f1e64f2b2ad1440f758ebfc97282be40f74673c",
      script: {},
    },
    rollupConfig: {
      requiredStakingCapacity: "0x2540be400",
      challengeMaturityBlocks: "0x64",
      finalityBlocks: "0x3",
      rewardBurnRate: "0x32",
      chainId: "0x116e8",
    },
    version: "v1.1.0",
  } as NodeInfo;
};

test("init gw config", async (t) => {
  const config = await gwConfig.init(() =>
    console.log("gw config initialized!")
  );
  t.deepEqual(config.eoas, {
    eth: {
      type: "Eth",
      typeHash:
        "0x1272c80507fe5e6cf33cf3e5da6a5f02430de40abb14410ea0459361bf74ebe0",
    },
    tron: undefined,
  });
  t.is(config.accounts?.creator.id, "0x4");
  t.is(config.accounts?.defaultFrom.id, "0x2");
  t.is(config.accounts?.ethAddrReg.id, "0x3");
  t.is(config.web3ChainId, "0x116e8");
});
