import http from "http";
import https from "https";
import { RPC as Rpc } from "@ckb-lumos/toolkit";

const httpAgent = new http.Agent({
  keepAlive: true,
});
const httpsAgent = new https.Agent({
  keepAlive: true,
});

export class RPC extends Rpc {
  constructor(url: string, options?: object) {
    let agent: http.Agent | https.Agent = httpsAgent;
    if (url.startsWith("http:")) {
      agent = httpAgent;
    }

    options = options || {};
    (options as any).agent ||= agent;
    super(url, options);
  }
}
