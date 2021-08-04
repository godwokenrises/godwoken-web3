import * as modules from "./modules";
import { Callback } from "./types";

/**
 * get all methods. e.g., getBlockByNumber in eth module
 * @private
 * @param  {Object}   mod
 * @return {string[]}
 */
function getMethodNames(mod: any): string[] {
  return Object.getOwnPropertyNames(mod.prototype);
}

/**
 * return all the methods in all module
 */
function getMethods() {
  const methods: any = {};

  modules.list.forEach((modName: string) => {
    const mod = new (modules as any)[modName]();
    getMethodNames((modules as any)[modName])
      .filter((methodName: string) => methodName !== "constructor")
      .forEach((methodName: string) => {
        const concatedMethodName = `${modName.toLowerCase()}_${methodName}`;
        methods[concatedMethodName] = async (args: any[], cb: Callback) => {
          try {
            const result = await mod[methodName].bind(mod)(args);
            cb(null, result);
          } catch (err) {
            if (err.name === "RpcError") {
              return cb({
                code: err.code,
                message: err.message,
              });
            }
            throw err;
          }
        };
      });
  });

  console.log(methods);
  return methods;
}

const methods = getMethods();

module.exports = methods;
