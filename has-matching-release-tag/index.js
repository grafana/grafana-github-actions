"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const utils_1 = require("../common/utils");
const hasMatchingReleaseTag_1 = require("./hasMatchingReleaseTag");
try {
    let refName = (0, utils_1.getRequiredInput)('ref_name');
    console.log('Input ref_name: ' + refName);
    let withPath = (0, utils_1.getInput)('release_branch_with_patch_regexp');
    let bool = (0, hasMatchingReleaseTag_1.hasMatchingReleaseTag)(refName, new RegExp((0, utils_1.getRequiredInput)('release_tag_regexp')), new RegExp((0, utils_1.getRequiredInput)('release_branch_regexp')), withPath ? new RegExp(withPath) : undefined);
    console.log('Output bool: ' + bool);
    (0, core_1.setOutput)('bool', bool);
}
catch (error) {
    (0, core_1.setFailed)(error);
}
//# sourceMappingURL=index.js.map