import { EthBlock } from "../base/types/api";
import { BlockEmitter } from "../block-emitter";
import { INVALID_PARAMS, METHOD_NOT_FOUND } from "../methods/error-code";
import { methods } from "../methods/index";
import { middleware as wsrpc } from "./wss";
import crypto from "crypto";
import { HexNumber } from "@ckb-lumos/base";
import { Log, LogQueryOption, toApiLog } from "../db/types";
import { filterLogsByAddress, filterLogsByTopics } from "../db";

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

  const newHeadsIds: Set<HexNumber> = new Set();
  const syncingIds: Set<HexNumber> = new Set();
  const logsIds: Set<HexNumber> = new Set();
  const logsQueryMaps: Map<HexNumber, LogQueryOption> = new Map();

  const blockListener = (blocks: EthBlock[]) => {
    blocks.forEach((block) => {
      newHeadsIds.forEach((id) => {
        const obj = {
          jsonrpc: "2.0",
          method: "eth_subscription",
          params: {
            result: block,
            subscription: id,
          },
        };
        ws.send(JSON.stringify(obj));
      });
    });
  };

  const logsListener = (logs: Log[]) => {
    logsIds.forEach(async (id) => {
      const query = logsQueryMaps.get(id);
      if (!query) return;

      const _result = await filterLogsByAddress(logs, query.address);
      const result = await filterLogsByTopics(_result, query.topics || []);

      if(result.length === 0) return;

      const obj = {
        jsonrpc: "2.0",
        method: "eth_subscription",
        params: {
          result: result.map((log) => toApiLog(log)),
          subscription: id,
        },
      };
      ws.send(JSON.stringify(obj));
    });
  };

  blockEmitter.getEmitter().on("newHeads", blockListener);
  blockEmitter.getEmitter().on("logs", logsListener);

  // when close connection, unsubscribe emitter.
  ws.on("close", function (...args: any[]) {
    blockEmitter.getEmitter().off("newHeads", blockListener);
  });

  ws.on("eth_subscribe", function (...args: any[]) {
    const params = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    const name = params[0];

    switch (name) {
      case "newHeads": {
        const id = newSubscriptionId();
        newHeadsIds.add(id);
        return cb(null, id);
      }

      case "syncing": {
        const id = newSubscriptionId();
        syncingIds.add(id);
        return cb(null, id);
      }

      case "logs": {
        const id = newSubscriptionId();
        try {
          const query = parseLogsSubParams(params);
          logsIds.add(id);
          logsQueryMaps.set(id, query);
          return cb(null, id);
        } catch (error) {
          return cb({
            code: INVALID_PARAMS,
            message: `no logs in params for "${name}" subscription method`,
          });
        }
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
    const result =
      newHeadsIds.delete(id) ||
      syncingIds.delete(id) ||
      (logsIds.delete(id) && logsQueryMaps.delete(id));

    cb(null, result);
  });

  function newSubscriptionId(): HexNumber {
    // todo: maybe replace with a more robust method like uuid
    return "0x" + crypto.randomBytes(16).toString("hex");
  }

  function parseLogsSubParams(params: any[]): LogQueryOption {
    if (params[1] !== "logs") {
      throw new Error("invalid params");
    }

    if (params[2]) {
      const query = {
        address: params[2].address,
        topics: params[2].topics,
      };
      return query;
    }

    return {};
  }
}
