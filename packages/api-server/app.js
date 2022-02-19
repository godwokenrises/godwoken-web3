const createError = require("http-errors");
const express = require("express");
const logger = require("morgan");
const jaysonMiddleware = require("./middlewares/jayson");
var cors = require("cors");
const { wrapper } = require("./lib/ws/methods");
const expressWs = require("express-ws");
const Sentry = require("@sentry/node");
const { applyRateLimitByIp } = require("./lib/rate-limit");
const { initSentry } = require("./lib/sentry");

NEW_RELIC_LICENSE_KEY = process.env.NEW_RELIC_LICENSE_KEY;

let newrelic = undefined;
if (NEW_RELIC_LICENSE_KEY) {
  console.log("new relic init !!!");
  newrelic = require("newrelic");
}

const app = express();

const BODY_PARSER_LIMIT = "100mb";

app.use(express.json({ limit: BODY_PARSER_LIMIT }));

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
  initSentry();

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
app.use(express.urlencoded({ extended: false, limit: BODY_PARSER_LIMIT }));

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

app.use(async function (req, res, next) {
  // restrict access rate limit via ip
  await applyRateLimitByIp(req, res, next);
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
