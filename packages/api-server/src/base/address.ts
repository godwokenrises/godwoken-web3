import { Hash, HexString, Script, utils } from "@ckb-lumos/base";
import { GodwokenClient } from "../../../godwoken/lib";
import { envConfig } from "./env-config";

export function ethAddressToScript(ethAddress: HexString): Script {
  return {
    code_hash: envConfig.ethAccountLockHash,
    hash_type: "type",
    args: envConfig.rollupTypeHash + ethAddress.slice(2).toLowerCase(),
  };
}

export function ethAddressToScriptHash(ethAddress: HexString): Hash {
  const script = ethAddressToScript(ethAddress);
  const scriptHash = utils.computeScriptHash(script);
  return scriptHash;
}

export function ethAddressToShortScriptHash(ethAddress: HexString): HexString {
  const scriptHash = ethAddressToScriptHash(ethAddress);
  return scriptHash.slice(0, 42);
}

export async function shortScriptHashToEthAddress(
  godwokenClient: GodwokenClient,
  shortScriptHash: HexString
): Promise<HexString | undefined> {
  const scriptHash = await godwokenClient.getScriptHashByShortScriptHash(
    shortScriptHash
  );
  if (scriptHash == null) {
    return undefined;
  }
  const script = await godwokenClient.getScript(scriptHash);
  if (script == null) {
    return undefined;
  }
  if (script.code_hash !== envConfig.ethAccountLockHash) {
    return undefined;
  }
  return "0x" + script.args.slice(66, 106);
}

export function isAddressMatch(
  ethAddress: HexString,
  shortScriptHash: HexString
): boolean {
  const computedShortScriptHash = ethAddressToShortScriptHash(ethAddress);
  return shortScriptHash === computedShortScriptHash;
}

export async function isShortScriptHashOnChain(
  godwokenClient: GodwokenClient,
  shortScriptHash: HexString
) {
  const scriptHash = await godwokenClient.getScriptHashByShortScriptHash(
    shortScriptHash
  );
  if (scriptHash == null) {
    return false;
  }
  return true;
}
