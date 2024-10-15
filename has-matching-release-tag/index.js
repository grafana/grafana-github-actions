"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
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
    (0, core_1.setOutput)('bool', hasMatchingBool);
}
catch (error) {
    // Failed to spawn child process from execFileSync call.
    if (error.code) {
        (0, core_1.setFailed)(error.code);
    }
    // Child was spawned but exited with non-zero exit code.
    if (error.stdout || error.stderr) {
        const { stdout, stderr } = error;
        (0, core_1.setFailed)(prefixLines('stdout: ', (0, utils_1.splitStringIntoLines)(stdout))
            .concat(prefixLines('stderr: ', (0, utils_1.splitStringIntoLines)(stderr)))
            .join('\n'));
    }
    // Some other error was thrown.
    (0, core_1.setFailed)(error);
}
//# sourceMappingURL=index.js.map