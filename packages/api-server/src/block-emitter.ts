import { envConfig } from "./base/env-config";
import { logger } from "./base/logger";
import { Query } from "./db";
import { EventEmitter } from "events";
import { toApiNewHead } from "./db/types";
import cluster from "cluster";

let newrelic: any = undefined;
if (envConfig.newRelicLicenseKey) {
  newrelic = require("newrelic");
}

// Only start in main worker, and `startWorker` in workers to get emitter.
export class BlockEmitter {
  private query: Query;
  private isRunning: boolean;
  private currentTip: bigint;
  private emitter: EventEmitter;

  constructor() {
    this.query = new Query();
    this.isRunning = false;
    this.currentTip = -1n;
    this.emitter = new EventEmitter();
  }

  // Main worker
  async start() {
    this.isRunning = true;
    const currentTip: bigint | undefined = await this.query.getTipBlockNumber();

    if (currentTip != null) {
      this.currentTip = currentTip;
    }
    this.scheduleLoop();
  }

  // cluster workers
  startWorker() {
    process.on("message", (msg: any) => {
      const type = msg.type;
      const content = msg.content;
      if (type === "BlockEmitter#newHeads") {
        this.emitter.emit("newHeads", content);
      } else if (type === "BlockEmitter#logs") {
        this.emitter.emit("logs", content);
      }
    });
  }

  stop() {
    this.isRunning = false;
  }

  running() {
    return this.isRunning;
  }

  scheduleLoop(timeout = 1) {
    setTimeout(() => {
      this.loop();
    }, timeout);
  }

  loop() {
    if (!this.running()) {
      return;
    }
    this.poll()
      .then((timeout) => {
        this.scheduleLoop(timeout);
      })
      .catch((e) => {
        logger.error(`Error occurs: ${e} ${e.stack}, stopping emit newHeads!`);
        this.stop();
      });
  }

  async poll() {
    let timeout = 1000;
    const tip = await this.query.getTipBlockNumber();
    if (tip == null || this.currentTip >= tip) {
      return timeout;
    }

    // add new relic background transaction
    if (envConfig.newRelicLicenseKey) {
      return newrelic.startBackgroundTransaction(
        `BlockEmitter#pool`,
        async () => {
          newrelic.getTransaction();
          try {
            const min = this.currentTip;
            const max = tip;
            const blocks = await this.query.getBlocksByNumbers(min, max);
            const newHeads = blocks.map((b) => toApiNewHead(b));
            this.emitter.emit("newHeads", newHeads);
            const logs = await this.query.getLogs({}, min + BigInt(1), max); // exclude min & include max;
            this.emitter.emit("logs", logs);
            this.currentTip = tip;

            return timeout;
          } catch (error) {
            throw error;
          } finally {
            newrelic.endTransaction();
          }
        }
      );
    }

    const min = this.currentTip;
    const max = tip;
    const blocks = await this.query.getBlocksByNumbers(min, max);
    const newHeads = blocks.map((b) => toApiNewHead(b));
    this.notify("newHeads", newHeads);
    const logs = await this.query.getLogs({}, min + BigInt(1), max); // exclude min & include max;
    const newLogs = logs.map((log) =>
      JSON.stringify(
        log,
        (key, value) => (typeof value === "bigint" ? value.toString() : value) // return everything else unchanged
      )
    );
    if (logs.length > 0) {
      this.notify("logs", newLogs);
    }
    this.currentTip = tip;

    return timeout;
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }

  private notify(type: string, content: any) {
    const workers = cluster.workers!;
    for (const workerId in workers) {
      const worker = workers[workerId];
      if (worker) {
        worker.send({
          type: `BlockEmitter#${type}`,
          content,
        });
      }
    }
  }
}
