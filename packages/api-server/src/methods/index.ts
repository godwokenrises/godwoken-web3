import * as modules from "./modules";
import { Callback } from "./types";
import * as Sentry from "@sentry/node";
import { AppError, ERRORS } from "./error";
import { envConfig } from "../base/env-config";

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
        methods[concatedMethodName] = async (args: any[], cb: Callback) => {
          try {
            const result = await mod[methodName].bind(mod)(args);
            return cb(null, result);
          } catch (err: any) {
            if (
              envConfig.sentryDns &&
              err.code !== ERRORS.INTERNAL_ERROR.code
            ) {
              Sentry.captureException(err, {
                extra: { method: concatedMethodName, params: args },
              });
            }
            if (err instanceof AppError) {
              return cb(err);
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
