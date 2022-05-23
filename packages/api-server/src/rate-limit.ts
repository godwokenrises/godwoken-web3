import { AccessGuard } from "./cache/guard";
import { Request, Response, NextFunction } from "express";
import { logger } from "./base/logger";
import { ERRORS } from "./methods/error";

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

      const remainSecs = await accessGuard.getKeyTTL(rpcMethod, reqId);
      const remainMilsecs = remainSecs * 1000;
      const httpRateLimitCode = 429;
      const httpRateLimitHeader = {
        "Retry-After": remainMilsecs.toString(),
      };

      const error = {
        code: ERRORS.RATE_LIMITED.code,
        message: ERRORS.RATE_LIMITED.message,
        data: {
          ip: reqId,
          method: rpcMethod,
        },
      };
      logger.debug(
        `Rate Limit Exceed, ip: ${reqId}, method: ${rpcMethod}, ttl: ${remainSecs}s`
      );

      const content = Array.isArray(req.body)
        ? req.body.map((b) => {
            return {
              jsonrpc: "2.0",
              id: b.id,
              error: error,
            };
          })
        : {
            jsonrpc: "2.0",
            id: req.body.id,
            error: error,
          };
      res.status(httpRateLimitCode).header(httpRateLimitHeader).send(content);
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
