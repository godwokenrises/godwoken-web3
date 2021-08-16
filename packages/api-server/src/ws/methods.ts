import { EthBlock } from "../base/types/api";
import { BlockEmitter } from "../block-emitter";
import { METHOD_NOT_FOUND } from "../methods/error-code";
import { methods } from "../methods/index";
import { middleware as wsrpc } from "./wss";
import crypto from "crypto";
import { HexNumber } from "@ckb-lumos/base";

const blockEmitter = new BlockEmitter();
blockEmitter.start();

export function wrapper(ws: any, _req: any) {
  // this function gets called on each connection

  wsrpc(ws);

  for (const [key, value] of Object.entries(methods)) {
    ws.on(key, function (...args: any[]) {
      const params = args.slice(0, args.length - 1);
      const cb = args[args.length - 1];
      (value as any)(params, cb);
    });
  }

  let resultId = 0;
  const newHeadsIds: Set<number> = new Set();
  const syncingIds: Set<HexNumber> = new Set();
  const logsIds: Set<number> = new Set();

  const blockListener = (blocks: EthBlock[]) => {
    blocks.forEach((block) => {
      newHeadsIds.forEach((id) => {
        const obj = {
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: {
            result: block,
            subscription: "0x" + id.toString(16),
          },
        };
        ws.send(JSON.stringify(obj));
      });
    });
  };

  blockEmitter.getEmitter().on("newHeads", blockListener);

  // when close connection, unsubscribe emitter.
  ws.on("close", function (...args: any[]) {
    blockEmitter.getEmitter().off("newHeads", blockListener);
  });

  ws.on("eth_subscribe", function (...args: any[]) {
    const params = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    const name = params[0];

    switch (name) {
      case "newHeads":
        {
        const id = newSubscriptionId();
        newHeadsIds.add(id);
        return cb(null, "0x" + id.toString(16));}
      
      case "syncing":
        {
          const id = "0x" + crypto.randomBytes(16).toString("hex");
          syncingIds.add(id);
          return cb(null, id);
        }

      case "logs":
        {
          const id = newSubscriptionId();
          logsIds.add(id);
          return cb(null, "0x" + id.toString(16));
        }
    
      default:
        return cb({
          code: METHOD_NOT_FOUND,
          message: `no "${name}" subscription in eth namespace`,
        });
    }
  });

  ws.on("eth_unsubscribe", function (...args: any[]) {
    const params = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    const id = params[0];
    const result = newHeadsIds.delete(+id) || syncingIds.delete(id);

    cb(null, result);
  });

  function newSubscriptionId(): number{
    // todo: maybe replace with a more robust method like uuid
    resultId += 1;
    return resultId; 
  }
}
