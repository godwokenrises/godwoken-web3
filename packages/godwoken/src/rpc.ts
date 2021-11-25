import http from "http";
import https from "https";
import { XMLHttpRequest as XHR2 } from "xhr2-cookies";
import { errors } from "web3-core-helpers";

export class RPC {
  host: string;
  withCredentials: boolean;
  timeout: number;
  headers: any;
  agent: any;
  connected: boolean;
  httpsAgent: any;
  httpAgent: any;
  baseUrl: any;

  constructor(host: string, options?: any) {
    options = options || {};
    this.host = host;
    this.withCredentials = options.withCredentials || false;
    this.timeout = options.timeout || 0;
    this.headers = options.headers;
    this.agent = options.agent;
    this.connected = false;

    // keepAlive is true unless explicitly set to false
    const keepAlive = options.keepAlive !== false;
    if (!this.agent) {
      if (this.host.substring(0, 5) === "https") {
        this.httpsAgent = new https.Agent({ keepAlive });
      } else {
        this.httpAgent = new http.Agent({ keepAlive });
      }
    }
  }

  _prepareRequest() {
    let request: XHR2;

    request = new XHR2();
    let agents = {
      httpsAgent: this.httpsAgent,
      httpAgent: this.httpAgent,
      baseUrl: this.baseUrl,
    };

    if (this.agent) {
      agents.httpsAgent = this.agent.https;
      agents.httpAgent = this.agent.http;
      agents.baseUrl = this.agent.baseUrl;
    }

    request.nodejsSet(agents);

    request.open("POST", this.host, true);
    request.setRequestHeader("Content-Type", "application/json");
    request.timeout = this.timeout;
    request.withCredentials = this.withCredentials;

    if (this.headers) {
      this.headers.forEach(function (header: { name: string; value: any }) {
        request.setRequestHeader(header.name, header.value);
      });
    }

    return request;
  }

  async call(method: string, params: any[]) {
    let _this = this;
    let request = this._prepareRequest();

    const id = Math.round(Math.random() * 10000000);
    const payload = {
      jsonrpc: "2.0",
      id: id,
      method: method,
      params: params,
    };

    return new Promise(function (resolve, reject) {
      request.onreadystatechange = function () {
        if (request.readyState === 4 && request.timeout !== 1) {
          let result = request.responseText;
          let error = null;

          try {
            result = JSON.parse(result);
          } catch (e) {
            error = errors.InvalidResponse(new Error(request.responseText));
          }

          _this.connected = true;

          if (error) return reject(error);

          if ((result as any).error) {
            return reject((result as any).error);
          }
          return resolve((result as any).result);
        }
      };

      request.ontimeout = function () {
        _this.connected = false;
        return reject(errors.ConnectionTimeout(this.timeout.toString()));
      };

      try {
        request.send(JSON.stringify(payload));
      } catch (error) {
        _this.connected = false;
        return reject(errors.InvalidConnection(_this.host));
      }
    });
  }
}
