import { logger } from "../base/logger";

export function middleware(ws: any) {
  ws.on("message", dispatch);
  ws.on("data", dispatch);

  function dispatch(msg: string) {
    try {
      const obj = JSON.parse(msg.toString());

      // log request
      if (process.env.WEB3_LOG_REQUEST_BODY) {
        logger.info("websocket request.body:", obj);
      } else {
        logger.info("websocket request.method:", obj.method);
      }

      const args = [obj.method].concat(obj.params, [
        (err: any, result: any) => responder(obj, err, result),
      ]);
      ws.emit.apply(ws, args);
    } catch {
      ws.close();
    }
  }

  function responder(obj: any, err: any, result: any) {
    const respObj: JsonRpcRequest = {
      id: obj.id,
      jsonrpc: "2.0",
    };
    if (err == null) {
      respObj.result = result;
    } else {
      respObj.error = err;
    }
    const resp = JSON.stringify(respObj);
    ws.send(resp);
  }
}

interface JsonRpcRequest {
  id: any;
  jsonrpc: "2.0";
  error?: any;
  result?: any;
}
