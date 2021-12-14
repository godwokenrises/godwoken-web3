import { decodeArgs } from "@polyjuice-provider/base";
import InputDataDecoder from "ethereum-input-data-decoder";
import { SUDT_ERC20_PROXY_ABI } from "./erc20";

const deocder = new InputDataDecoder(SUDT_ERC20_PROXY_ABI as any);

type HexString = string;

export function isErc20Transfer(args: HexString): boolean {
  try {
    const decodedArgs = decodeArgs(args);
    const inputData = deocder.decodeData(decodedArgs.data);

    if (inputData?.method === "transfer") {
      return true;
    }
  } catch {
    return false;
  }
  return false;
}
