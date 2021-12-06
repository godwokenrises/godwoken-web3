const { AccessGuard } = require("./lib/cache/guard");
const { LIMIT_EXCEEDED } = require("./lib/methods/error-code");

const accessGuard = new AccessGuard();
accessGuard.connect();

async function applyRateLimitByIp(req, res, next) {
  for (const method of Object.keys(accessGuard.rpcMethods)) {
    const ip = getIp(req);
    await rateLimit(req, res, next, method, ip);
  }
}

async function rateLimit(req, res, next, rpcMethod, reqId) {
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

function hasMethod(body, name) {
  if (Array.isArray(body)) {
    return body.map((b) => b.method).includes(name);
  }

  return body.method === name;
}

function getIp(req) {
  let ip;
  if (req.headers["x-forwarded-for"] != null) {
    ip = req.headers["x-forwarded-for"].split(",").map((i) => i.trim())[0];
  }

  return ip || req.socket.remoteAddress;
}

module.exports = {
  applyRateLimitByIp,
  rateLimit,
  hasMethod,
  getIp,
};
