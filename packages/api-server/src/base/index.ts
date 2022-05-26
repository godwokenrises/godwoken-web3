import { envConfig } from "./env-config";
import { GwConfig } from "./gw-config";

export const gwConfig = new GwConfig(envConfig.godwokenJsonRpc);
