import { logger } from "../base/logger";

export function middleware(ws: any) {
  ws.on("message", dispatch);
  ws.on("data", dispatch);

  function dispatch(msg: string) {
    try {
      const obj = JSON.parse(msg.toString());

      if (Array.isArray(obj)) {
        // log request
        if (process.env.WEB3_LOG_REQUEST_BODY) {
          logger.info("websocket request.body:", obj);
        } else {
          logger.info(
            "websocket request.method:",
            obj.map((o) => o.method)
          );
        }

        const args = ["@batchRequests" as any].concat(obj, [
          (info: any[]) => batchResponder(obj, info),
        ]);
        ws.emit.apply(ws, args);
        return;
      }

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

  function batchResponder(objs: any[], info: any[]) {
    const respObjs = objs.map((o, i) => {
      const { err, result } = info[i];
      const respObj: JsonRpcRequest = {
        id: o.id,
        jsonrpc: "2.0",
      };
      if (err == null) {
        respObj.result = result;
      } else {
        respObj.error = err;
      }
      return respObj;
    });

    const resp = JSON.stringify(respObjs);
    ws.send(resp);
  }
}

interface JsonRpcRequest {
  id: any;
  jsonrpc: "2.0";
  error?: any;
  result?: any;
}
