const createError = require("http-errors");
const express = require("express");
const logger = require("morgan");
const jaysonMiddleware = require("./middlewares/jayson");
var cors = require("cors");
const { wrapper } = require("./lib/ws/methods");
const expressWs = require("express-ws");
const Sentry = require("@sentry/node");
const { AccessGuard } = require("../api-server/lib/cache/guard");
const { LIMIT_EXCEEDED } = require("../api-server/lib/methods/error-code");

NEW_RELIC_LICENSE_KEY = process.env.NEW_RELIC_LICENSE_KEY;

let newrelic = undefined;
if (NEW_RELIC_LICENSE_KEY) {
  console.log("new relic init !!!");
  newrelic = require("newrelic");
}

const app = express();

app.use(express.json());

const sentryOptionRequest = [
  "cookies",
  "data",
  "headers",
  "method",
  "query_string",
  "url",
  "body",
];
const SENTRY_DNS = process.env.SENTRY_DNS;
if (SENTRY_DNS) {
  console.log("Sentry init !!!");

  Sentry.init({
    dsn: SENTRY_DNS,
    environment: process.env.SENTRY_ENVIRONMENT || "development",
  });

  // The request handler must be the first middleware on the app
  app.use(
    Sentry.Handlers.requestHandler({
      request: sentryOptionRequest,
    })
  );
}

expressWs(app);

const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  credentials: true,
};

app.use(logger("dev"));
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: false }));

app.use(function (req, _res, next) {
  if (NEW_RELIC_LICENSE_KEY) {
    // set new relic name
    const transactionName = `${req.method} ${req.url}#${req.body.method}`;
    console.log("#transactionName:", transactionName);
    newrelic.setTransactionName(transactionName);
  }

  // log request method / body
  if (process.env.WEB3_LOG_REQUEST_BODY) {
    console.log("request.body:", req.body);
  } else {
    const name = Array.isArray(req.body)
      ? req.body.map((o) => o.method)
      : req.body.method;
    console.log("request.method:", name);
  }
  next();
});

function hasMethod(body, name) {
  if (Array.isArray(body)) {
    return body.map((b) => b.method).includes(name);
  }

  return body.method === name;
}

function getIp(req) {
  if (
    Array.isArray(req.headers["x-forwarded-for"]) &&
    req.headers["x-forwarded-for"].length > 0
  ) {
    return req.headers["x-forwarded-for"][0];
  }

  return req.headers["x-forwarded-for"] || req.socket.remoteAddress;
}

const MAX_RPM = {
  poly_executeRawL2Transaction: 30, // max: 0.5 req/s = 30 req/m
};

const accessGuard = new AccessGuard();
accessGuard.connect();
accessGuard.setMaxRpm(
  "poly_executeRawL2Transaction",
  MAX_RPM.poly_executeRawL2Transaction
);

app.use(async function (req, res, next) {
  const ip = getIp(req);
  // restrict access rate limit
  if (hasMethod(req.body, "poly_executeRawL2Transaction") && ip != null) {
    const rpcRouter = "poly_executeRawL2Transaction";
    const reqId = ip;
    const isExist = await accessGuard.isExist(rpcRouter, reqId);
    if (!isExist) {
      await accessGuard.add(rpcRouter, reqId);
    }
    const isOverRate = await accessGuard.isOverRate(rpcRouter, reqId);
    if (isOverRate) {
      if (Array.isArray(req.body)) {
        return res.send([
          {
            jsonrpc: "2.0",
            id: req.body[0].id,
            error: {
              code: LIMIT_EXCEEDED,
              message:
                "you are temporally restrict to the service, please wait.",
            },
          },
        ]);
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

    await accessGuard.updateCount(rpcRouter, reqId);
  }

  next();
});

app.ws("/ws", wrapper);
app.use("/", jaysonMiddleware);

if (SENTRY_DNS) {
  // The error handler must be before any other error middleware and after all controllers
  app.use(
    Sentry.Handlers.errorHandler({
      request: sentryOptionRequest,
    })
  );
}

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  console.error(err.stack);

  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  console.error("err.status:", err.status);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err.status || 500);
  res.render("error");
});

module.exports = app;
