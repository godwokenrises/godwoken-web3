import * as modules from "./modules";
import { Callback } from "./types";
import * as Sentry from "@sentry/node";
import { INVALID_PARAMS } from "./error-code";

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
            return cb(null, result);
          } catch (err: any) {
            if (process.env.SENTRY_DNS && err.code !== INVALID_PARAMS) {
              Sentry.captureException(err, {
                extra: { method: concatedMethodName, params: args },
              });
            }
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

  // console.log(methods);
  return methods;
}

// TODO: maybe can merge to `getMethods`
// only `eth` module, `poly` module will conflict with leveldb lock.
function getEthWalletMethods() {
  const methods: any = {};

  const modName = "Eth";
  const mod = new (modules as any)[modName](true);
  getMethodNames((modules as any)[modName])
    .filter((methodName: string) => methodName !== "constructor")
    .forEach((methodName: string) => {
      const concatedMethodName = `${modName.toLowerCase()}_${methodName}`;
      methods[concatedMethodName] = async (args: any[], cb: Callback) => {
        try {
          const result = await mod[methodName].bind(mod)(args);
          cb(null, result);
        } catch (err: any) {
          if (process.env.SENTRY_DNS && err.code !== INVALID_PARAMS) {
            Sentry.captureException(err, {
              extra: { method: concatedMethodName, params: args },
            });
          }
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

  // console.log(methods);
  return methods;
}

export const methods = getMethods();
export const ethWalletMethods = getEthWalletMethods();
