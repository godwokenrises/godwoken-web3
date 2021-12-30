import { AccessGuard } from "./cache/guard";
import { LIMIT_EXCEEDED } from "./methods/error-code";
import { Request, Response, NextFunction } from "express";

export const accessGuard = new AccessGuard();
accessGuard.connect();

export async function applyRateLimitByIp(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const methods = Object.keys(accessGuard.rpcMethods);
  if (methods.length === 0) {
    return next();
  }

  let isResSent = false;
  for (const method of methods) {
    const ip = getIp(req);
    const isBan = await rateLimit(req, res, method, ip);

    if (isBan) {
      // if one method is ban, we refuse all
      isResSent = true;
      break;
    }
  }

  if (!isResSent) {
    next();
  }
}

export async function rateLimit(
  req: Request,
  res: Response,
  rpcMethod: string,
  reqId: string | undefined
) {
  let isBan = false;
  if (hasMethod(req.body, rpcMethod) && reqId != null) {
    const isExist = await accessGuard.isExist(rpcMethod, reqId);
    if (!isExist) {
      await accessGuard.add(rpcMethod, reqId);
    }

    const isOverRate = await accessGuard.isOverRate(rpcMethod, reqId);
    if (isOverRate) {
      isBan = true;
      console.debug(`Rate Limit Exceed, ip: ${reqId}, method: ${rpcMethod}`);

      const message = `Rate limit exceeded for your ip, please wait 1min and retry. RPC method: ${rpcMethod}.`;
      const error = {
        code: LIMIT_EXCEEDED,
        message: message,
      };
      Array.isArray(req.body)
        ? res.send(
            req.body.map((b) => {
              return {
                jsonrpc: "2.0",
                id: b.id,
                error: error,
              };
            })
          )
        : res.send({
            jsonrpc: "2.0",
            id: req.body.id,
            error: error,
          });
    } else {
      await accessGuard.updateCount(rpcMethod, reqId);
    }
  }
  return isBan;
}

export function hasMethod(body: any, name: string) {
  if (Array.isArray(body)) {
    return body.map((b) => b.method).includes(name);
  }

  return body.method === name;
}

export function getIp(req: Request) {
  let ip;
  if (req.headers["x-forwarded-for"] != null) {
    ip = (req.headers["x-forwarded-for"] as string).split(",")[0].trim();
  }

  return ip || req.socket.remoteAddress;
}
