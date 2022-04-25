"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const utils_1 = require("../common/utils");
const hasMatchingReleaseTag_1 = require("./hasMatchingReleaseTag");
(async () => {
    try {
        let refName = (0, utils_1.getRequiredInput)('ref_name');
        console.log('Input ref_name: ' + refName);
        let releaseTagRegexp = new RegExp((0, utils_1.getRequiredInput)('release_tag_regexp'));
        let releaseBranchWithoutPatchRegexp = new RegExp((0, utils_1.getRequiredInput)('release_branch_without_patch_regexp'));
        let releaseBranchWithPatchRegexp = new RegExp((0, utils_1.getRequiredInput)('release_branch_with_patch_regexp'));
        let bool = await (0, hasMatchingReleaseTag_1.hasMatchingReleaseTag)(refName, releaseTagRegexp, releaseBranchWithoutPatchRegexp, releaseBranchWithPatchRegexp);
        console.log('Output bool: ' + bool);
        (0, core_1.setOutput)('bool', bool);
    }
    catch (error) {
        (0, core_1.setFailed)(error);
    }
})();
//# sourceMappingURL=index.js.map