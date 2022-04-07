import cluster from "cluster";
import { cpus } from "os";
import { envConfig } from "../base/env-config";
import { BlockEmitter } from "../block-emitter";
import { initSentry } from "../sentry";

const numCPUs = cpus().length;
const clusterCount = +(envConfig.clusterCount || 0);
const numOfCluster = clusterCount || numCPUs;

if (cluster.isMaster) {
  console.log(`Master ${process.pid} is running`);

  initSentry();

  // Fork workers.
  for (let i = 0; i < numOfCluster; i++) {
    cluster.fork();
  }

  const blockEmitter = new BlockEmitter();
  blockEmitter.startForever();

  cluster.on("exit", (worker, _code, _signal) => {
    console.log(`worker ${worker.process.pid} died`);
  });
} else {
  require("./www");

  console.log(`Worker ${process.pid} started`);
}
