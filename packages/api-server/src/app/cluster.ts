import cluster from "cluster";
import { cpus } from "os";
import { envConfig } from "../base/env-config";
import { logger } from "../base/logger";
import { BlockEmitter } from "../block-emitter";
import { initSentry } from "../sentry";

const numCPUs = cpus().length;
const clusterCount = +(envConfig.clusterCount || 0);
const numOfCluster = clusterCount || numCPUs;

if (cluster.isMaster) {
  logger.info(`Master ${process.pid} is running`);

  initSentry();

  // Fork workers.
  for (let i = 0; i < numOfCluster; i++) {
    cluster.fork();
  }

  const blockEmitter = new BlockEmitter();
  blockEmitter.startForever();

  cluster.on("exit", (worker, _code, _signal) => {
    logger.info(`worker ${worker.process.pid} died`);
  });
} else {
  require("./www");

  logger.info(`Worker ${process.pid} started`);
}
