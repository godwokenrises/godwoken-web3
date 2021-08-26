import { envConfig } from "./base/env-config";
import { logger } from "./base/logger";
import { Query } from "./db";
import { EventEmitter } from "events";
import { toApiNewHead } from "./db/types";

let newrelic: any = undefined;
if (envConfig.newRelicLicenseKey) {
  newrelic = require("newrelic");
}

export class BlockEmitter {
  private query: Query;
  private isRunning: boolean;
  private currentTip: bigint;
  private emitter: EventEmitter;

  constructor() {
    this.query = new Query(envConfig.databaseUrl);
    this.isRunning = false;
    this.currentTip = -1n;
    this.emitter = new EventEmitter();
  }

  async start() {
    this.isRunning = true;
    const currentTip: bigint | undefined = await this.query.getTipBlockNumber();

    if (currentTip != null) {
      this.currentTip = currentTip;
    }
    this.scheduleLoop();
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
    this.emitter.emit("newHeads", newHeads);
    const logs = await this.query.getLogs({}, min + BigInt(1), max); // exclude min & include max;
    this.emitter.emit("logs", logs);
    this.currentTip = tip;

    return timeout;
  }

  getEmitter(): EventEmitter {
    return this.emitter;
  }
}
