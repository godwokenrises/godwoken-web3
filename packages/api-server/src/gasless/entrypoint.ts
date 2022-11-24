import { HexString } from "@ckb-lumos/base";
import { GodwokenClient } from "@godwoken-web3/godwoken";
import { EthRegistryAddress } from "../base/address";

// todo: maybe fetch the entrypoint contract info from godwoken?
export class EntryPointContract {
  public readonly address: HexString;
  private iAccountId: number | undefined;
  private rpc: GodwokenClient;

  constructor(rpc: string, address: HexString) {
    this.rpc = new GodwokenClient(rpc);
    this.address = address;
  }

  async init() {
    const registry = new EthRegistryAddress(this.address);
    const scriptHash = await this.rpc.getScriptHashByRegistryAddress(
      registry.serialize()
    );
    if (scriptHash == null) {
      throw new Error(
        `script hash not found by registry(${registry.serialize()}) from entrypoint address(${
          this.address
        })`
      );
    }

    const accountId = await this.rpc.getAccountIdByScriptHash(scriptHash);
    if (accountId == null) {
      throw new Error(
        `account id not found by script hash(${scriptHash}) from entrypoint address(${this.address})`
      );
    }

    this.iAccountId = accountId;
  }

  public get accountId(): number {
    return this.iAccountId!;
  }
}
