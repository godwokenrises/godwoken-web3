import * as Sentry from "@sentry/node";
import cluster from "cluster";
import { envConfig } from "./base/env-config";

export function initSentry() {
  if (envConfig.sentryDns) {
    Sentry.init({
      dsn: envConfig.sentryDns,
      environment: envConfig.sentryEnvironment || "development",
    });
    const processType = cluster.isMaster ? "master" : "cluster";
    console.log(`Sentry init in ${processType} !!!`);
  }
}
