const { platform } = require('os');
const { version: packageVersion } = require('../../../package.json');

export function getClientVersion() {
    //todo: change to rust process version
    const { version } = process
    return `Godwoken/v${packageVersion}/${platform()}/node${version.substring(1)}`;
}

export function toCamel (s: string) {
    return s.replace(/([-_][a-z])/ig, ($1) => {
      return $1.toUpperCase()
        .replace('-', '')
        .replace('_', '');
    });
};

export function toSnake (s: string) {
    return s.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
};

export function snakeToCamel (t: object) {
    // db schema: snake_name => json rpc: camelName
    var camel: any = {};
    Object.keys(t).map(key => {
       //@ts-ignore
       camel[toCamel(key)] = t[key];
    });
    return camel;
}

export function camelToSnake (t: object) {
    // json rpc: camelName => db schema: snake_name
    var snake: any = {};
    Object.keys(t).map(key => {
       //@ts-ignore
       snake[toSnake(key)] = t[key];
    });
    return snake;
} 

export function toHex (i: number) {
    if (typeof i !== 'number')
       return i;
    
    return '0x' + BigInt(i).toString(16);
}