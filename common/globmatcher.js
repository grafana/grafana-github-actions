"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkMatch = void 0;
const micromatch = __importStar(require("micromatch"));
function isMatch(input, matchers) {
    for (const matcher of matchers) {
        if (matcher(input)) {
            return true;
        }
    }
    return false;
}
// equivalent to "Array.some()" but expanded for debugging and clarity
function checkAny(inputs, globs) {
    const matchers = globs.map((g) => micromatch.matcher(g));
    for (const changedFile of inputs) {
        if (isMatch(changedFile, matchers)) {
            return true;
        }
    }
    return false;
}
// equivalent to "Array.every()" but expanded for debugging and clarity
function checkAll(inputs, globs) {
    const matchers = globs.map((g) => micromatch.matcher(g));
    for (const changedFile of inputs) {
        if (!isMatch(changedFile, matchers)) {
            return false;
        }
    }
    return true;
}
function checkMatch(inputs, matchConfig) {
    if (matchConfig.all !== undefined) {
        if (!checkAll(inputs, matchConfig.all)) {
            return false;
        }
    }
    if (matchConfig.any !== undefined) {
        if (!checkAny(inputs, matchConfig.any)) {
            return false;
        }
    }
    return true;
}
exports.checkMatch = checkMatch;
//# sourceMappingURL=globmatcher.js.map