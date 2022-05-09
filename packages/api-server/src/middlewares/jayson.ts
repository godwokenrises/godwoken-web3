import jayson from "jayson";
import { methods, ethWalletMethods } from "../methods/index";
import { Request, Response, NextFunction } from "express";
import createServer from "connect";

const server = new jayson.Server(methods);
const ethWalletServer = new jayson.Server(ethWalletMethods);

export const jaysonMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // we use jayson, and {params: null} will be treated as illegal while undefined will not.
  // because this line of code https://github.com/tedeh/jayson/blob/master/lib/utils.js#L331
  if (req.body && req.body.params == null) {
    req.body.params = [] as any[];
  }

  if (req.url.endsWith("/eth-wallet")) {
    const middleware =
      ethWalletServer.middleware() as createServer.NextHandleFunction;
    return middleware(req, res, next);
  }
  const middleware = server.middleware() as createServer.NextHandleFunction;
  return middleware(req, res, next);
};
