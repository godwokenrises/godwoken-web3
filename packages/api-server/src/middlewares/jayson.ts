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
  if (req.url.endsWith("/eth-wallet")) {
    const middleware =
      ethWalletServer.middleware() as createServer.NextHandleFunction;
    return middleware(req, res, next);
  }
  const middleware = server.middleware() as createServer.NextHandleFunction;
  return middleware(req, res, next);
};
