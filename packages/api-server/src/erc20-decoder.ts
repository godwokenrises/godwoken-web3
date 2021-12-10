import { decodeArgs } from "@polyjuice-provider/base";
import InputDataDecoder from "ethereum-input-data-decoder";

const abiItems = require("../SudtERC20Proxy.abi.json");
const deocder = new InputDataDecoder(abiItems);

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
