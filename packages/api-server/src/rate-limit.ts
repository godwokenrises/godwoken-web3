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
  for (const method of Object.keys(accessGuard.rpcMethods)) {
    const ip = getIp(req);
    await rateLimit(req, res, next, method, ip);
  }
}

export async function rateLimit(
  req: Request,
  res: Response,
  next: NextFunction,
  rpcMethod: string,
  reqId: string | undefined
) {
  if (hasMethod(req.body, rpcMethod) && reqId != null) {
    const isExist = await accessGuard.isExist(rpcMethod, reqId);
    if (!isExist) {
      await accessGuard.add(rpcMethod, reqId);
    }

    const isOverRate = await accessGuard.isOverRate(rpcMethod, reqId);
    if (isOverRate) {
      console.debug(`Rate Limit Exceed, ip: ${reqId}, method: ${rpcMethod}`);

      if (Array.isArray(req.body)) {
        return res.send(
          req.body.map((b) => {
            return {
              jsonrpc: "2.0",
              id: b.id,
              error: {
                code: LIMIT_EXCEEDED,
                message:
                  "you are temporally restrict to the service, please wait.",
              },
            };
          })
        );
      }

      return res.send({
        jsonrpc: "2.0",
        id: req.body.id,
        error: {
          code: LIMIT_EXCEEDED,
          message: "you are temporally restrict to the service, please wait.",
        },
      });
    }

    await accessGuard.updateCount(rpcMethod, reqId);
  }

  next();
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
