import { asyncSleep } from "./util";
import path from "path";
import fs from "fs";
import v8Profiler from "v8-profiler-next";

export function cpuProf(timeMs?: number) {
  return function (
    _target: any,
    _name: string,
    descriptor: TypedPropertyDescriptor<(args: any) => Promise<any>>
  ) {
    const oldFunc = descriptor.value;
    descriptor.value = async function (p: any) {
      // set generateType 1 to generate new format for cpuprofile
      // to be compatible with cpuprofile parsing in vscode.
      v8Profiler.setGenerateType(1);
      v8Profiler.startProfiling("CPU profile");
      const result = await oldFunc?.apply(this, p);
      // stop profile
      if (timeMs != null) {
        await asyncSleep(timeMs);
      }
      const profile = v8Profiler.stopProfiling();
      const cpuprofile = path.join(`${Date.now()}.cpuprofile`);
      profile
        .export()
        .pipe(fs.createWriteStream(cpuprofile))
        .on("finish", () => profile.delete());

      return result;
    };
    return descriptor;
  };
}
