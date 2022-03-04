import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import { GodwokenClient, RawL2Transaction } from "@godwoken-web3/godwoken";
import { envConfig } from "./env-config";
import { Uint32 } from "./types/uint";

class EthToGwArgsBuilder {
  private method: number;
  private ethAddress: HexString;

  constructor(method: number, ethAddress: HexString) {
    if (ethAddress.length !== 42) {
      throw new Error("Eth address must be 20 bytes length");
    }

    if (!ethAddress.startsWith("0x")) {
      throw new Error("Eth address must starts with 0x prefix");
    }

    this.method = method;
    this.ethAddress = ethAddress;
  }

  public build(): HexString {
    const methodLe: HexString = new Uint32(this.method).toLittleEndian();
    return methodLe + this.ethAddress.slice(2);
  }
}

// TODO: cache
export async function ethAddressToScriptHash(
  ethAddress: HexString,
  godwokenClient: GodwokenClient
): Promise<Hash | undefined> {
  const fromId: number = +envConfig.defaultFromId;
  const nonce: number = await godwokenClient.getNonce(fromId);
  const args: HexString = new EthToGwArgsBuilder(0, ethAddress).build();

  const rawL2Tx: RawL2Transaction = {
    from_id: "0x" + fromId.toString(16),
    to_id: "0x" + (+envConfig.ethAddressRegistryAccountId).toString(16),
    nonce: "0x" + nonce.toString(16),
    args,
  };

  let scriptHash: Hash | undefined;
  try {
    const runResult = await godwokenClient.executeForGetAccountScriptHash(
      rawL2Tx
    );
    scriptHash = runResult.return_data;
  } catch (err: any) {
    // Account not found.
    return undefined;
  }
  return scriptHash;
}

export async function ethAddressToShortScriptHash(
  ethAddress: HexString,
  godwokenClient: GodwokenClient
): Promise<HexString | undefined> {
  const scriptHash: Hash | undefined = await ethAddressToScriptHash(
    ethAddress,
    godwokenClient
  );
  if (scriptHash == null) {
    return undefined;
  }
  return scriptHash.slice(0, 42);
}

export async function ethAddressToAccountId(
  ethAddress: HexString,
  godwokenClient: GodwokenClient
): Promise<number | undefined> {
  if (ethAddress === "0x0000000000000000000000000000000000000000") {
    return +envConfig.creatorAccountId;
  }

  const scriptHash: Hash | undefined = await ethAddressToScriptHash(
    ethAddress,
    godwokenClient
  );
  if (scriptHash == null) {
    return undefined;
  }

  const id: number | undefined = await godwokenClient.getAccountIdByScriptHash(
    scriptHash
  );
  return id;
}

export function ethEoaAddressToScriptHash(address: string) {
  const script: Script = {
    code_hash: envConfig.ethAccountLockHash,
    hash_type: "type",
    args: envConfig.rollupTypeHash + address.slice(2),
  };
  const scriptHash = utils.computeScriptHash(script);
  return scriptHash;
}
