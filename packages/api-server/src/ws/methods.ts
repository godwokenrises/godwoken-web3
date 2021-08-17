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
    logsQueryMaps.forEach((query, id) => {
      const _result = filterLogsByAddress(logs, query.address);
      const result = filterLogsByTopics(_result, query.topics || []);

      if (result.length === 0) return;

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
    blockEmitter.getEmitter().off("logs", logsListener);
  });

  function ethSubscribe(params: any[], cb: any) {
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
  }

  ws.on("eth_subscribe", function (...args: any[]) {
    const params = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    return ethSubscribe(params, cb);
  });

  function ethUnsubscribe(params: any[], cb: any) {
    const id = params[0];
    const result =
      newHeadsIds.delete(id) ||
      syncingIds.delete(id) ||
      logsQueryMaps.delete(id);

    cb(null, result);
  }

  ws.on("eth_unsubscribe", function (...args: any[]) {
    const params = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    return ethUnsubscribe(params, cb);
  });

  function newSubscriptionId(): HexNumber {
    return "0x" + crypto.randomBytes(16).toString("hex");
  }

  function parseLogsSubParams(params: any[]): LogQueryOption {
    if (params[0] !== "logs") {
      throw new Error("invalid params");
    }

    if (params[1] && typeof params[1] !== "object") {
      throw new Error("invalid params");
    }

    if (params[1]) {
      const query = {
        address: params[1].address,
        topics: params[1].topics,
      };
      return query;
    }

    return {};
  }

  ws.on("@batchRequests", async function (...args: any[]) {
    const objs = args.slice(0, args.length - 1);
    const cb = args[args.length - 1];

    const callback = (err: any, result: any) => {
      return { err, result };
    };
    const info = await Promise.all(
      objs.map(async (obj) => {
        if (obj.method === "eth_subscribe") {
          const r = ethSubscribe(obj.params, callback);
          return r;
        } else if (obj.method === "eth_unsubscribe") {
          const r = ethUnsubscribe(obj.params, callback);
          return r;
        }
        const value = methods[obj.method];
        if (value == null) {
          return {
            err: {
              code: METHOD_NOT_FOUND,
              message: `method ${obj.method} not found!`,
            },
          };
        }
        const r = await (value as any)(obj.params, callback);
        return r;
      })
    );
    cb(info);
  });
}
