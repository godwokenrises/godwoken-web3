import * as modules from "./modules";
import { Callback } from "./types";
import * as Sentry from "@sentry/node";
import { INVALID_PARAMS } from "./error-code";
import { RpcError } from "./error";

/**
 * get all methods. e.g., getBlockByNumber in eth module
 * @private
 * @param  {Object}   mod
 * @return {string[]}
 */
function getMethodNames(mod: any): string[] {
  return Object.getOwnPropertyNames(mod.prototype);
}

export interface ModConstructorArgs {
  [modName: string]: any[];
}

/**
 * return all the methods in all module
 */
function getMethods(argsList: ModConstructorArgs = {}) {
  const methods: any = {};

  modules.list.forEach((modName: string) => {
    const args = argsList[modName.toLowerCase()] || [];
    const mod = new (modules as any)[modName](...args);
    getMethodNames((modules as any)[modName])
      .filter((methodName: string) => methodName !== "constructor")
      .forEach((methodName: string) => {
        const concatedMethodName = `${modName.toLowerCase()}_${methodName}`;
        methods[concatedMethodName] = async (
          args: any[] | undefined,
          cb: Callback
        ) => {
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
              if (err.data) {
                return cb({
                  code: err.code,
                  message: err.message,
                  data: err.data,
                } as RpcError);
              }
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

const ethWalletMode = true;

export const methods = getMethods();
export const ethWalletMethods = getMethods({ eth: [ethWalletMode] });
