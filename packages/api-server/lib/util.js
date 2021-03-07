"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClientVersion = void 0;
const { platform } = require('os');
const { version: packageVersion } = require('../../../package.json');
function getClientVersion() {
    const { version } = process;
    return `Godwoken/v${packageVersion}/${platform()}/node${version.substring(1)}`;
}
exports.getClientVersion = getClientVersion;
//# sourceMappingURL=util.js.map