const { platform } = require('os');
const { version: packageVersion } = require('../../../package.json');

export function getClientVersion() {
    //todo: change to rust process version
    const { version } = process
    return `Godwoken/v${packageVersion}/${platform()}/node${version.substring(1)}`;
}