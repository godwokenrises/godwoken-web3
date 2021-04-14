import * as modules from "./modules";

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
        methods[concatedMethodName] = mod[methodName].bind(mod);
      });
  });

  return methods;
}

const methods = getMethods();

module.exports = methods;
