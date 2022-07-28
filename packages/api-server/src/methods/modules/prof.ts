import { cpuProf } from "../../decorator";
import v8Profiler from "v8-profiler-next";
import fs from "fs";
import path from "path";

const PROF_TIME_MS = 25000; // 25s

export class Prof {
  constructor() {}

  @cpuProf(PROF_TIME_MS)
  async cpu(_args: []): Promise<string> {
    return "ok";
  }

  async heap() {
    const createHeadDumpFile = async (fileName: string) => {
      return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(fileName);
        const snapshot = v8Profiler.takeSnapshot();
        const transform = snapshot.export();
        transform.pipe(file);
        transform.on("finish", () => {
          snapshot.delete.bind(snapshot);
          resolve(fileName);
        });
        transform.on("error", reject);
      });
    };
    const name = path.join(`${Date.now()}.heapsnapshot`);
    await createHeadDumpFile(name);
    return "ok";
  }
}
