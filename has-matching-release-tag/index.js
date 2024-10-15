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
const core = __importStar(require("@actions/core"));
const utils_1 = require("../common/utils");
const hasMatchingReleaseTag_1 = require("./hasMatchingReleaseTag");
function prefixLines(prefix, lines) {
    return lines.map((l) => `${prefix}${l}`);
}
try {
    const refName = (0, utils_1.getRequiredInput)('ref_name');
    const withPath = (0, utils_1.getInput)('release_branch_with_patch_regexp');
    core.info('Input ref_name: ' + refName);
    const hasMatchingBool = (0, hasMatchingReleaseTag_1.hasMatchingReleaseTag)(refName, new RegExp((0, utils_1.getRequiredInput)('release_tag_regexp')), new RegExp((0, utils_1.getRequiredInput)('release_branch_regexp')), withPath ? new RegExp(withPath) : undefined);
    core.info('Output bool: ' + hasMatchingBool);
    core.setOutput('bool', hasMatchingBool);
}
catch (error) {
    // Failed to spawn child process from execFileSync call.
    if (error.code) {
        core.setFailed(error.code);
    }
    // Child was spawned but exited with non-zero exit code.
    if (error.stdout || error.stderr) {
        const { stdout, stderr } = error;
        core.setFailed(prefixLines('stdout: ', (0, utils_1.splitStringIntoLines)(stdout))
            .concat(prefixLines('stderr: ', (0, utils_1.splitStringIntoLines)(stderr)))
            .join('\n'));
    }
    // Some other error was thrown.
    core.setFailed(error);
}
//# sourceMappingURL=index.js.map