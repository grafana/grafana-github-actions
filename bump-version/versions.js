"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVersionMatch = void 0;
function getVersionMatch(version) {
    return version.match(/^(\d+.\d+).\d+(?:-(((beta)\d+)|(?:pre)))?$/);
}
exports.getVersionMatch = getVersionMatch;
//# sourceMappingURL=versions.js.map