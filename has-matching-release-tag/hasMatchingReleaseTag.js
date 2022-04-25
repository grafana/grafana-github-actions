"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMatchingReleaseTagWithRefNames = exports.filterRefNames = exports.hasMatchingReleaseTag = void 0;
const exec_1 = require("@actions/exec");
async function hasMatchingReleaseTag(refName, releaseTagRegexp, releaseBranchWithoutPatchRegexp, releaseBranchWithPatchRegexp) {
    let refNames = [];
    const options = {
        listeners: {
            stdout: (data) => {
                refNames = data.toString().split(/(?:\r\n|\r|\n)/g);
            },
        },
    };
    await (0, exec_1.exec)('git', ['tag'], options);
    return hasMatchingReleaseTagWithRefNames(refNames, refName, releaseTagRegexp, releaseBranchWithoutPatchRegexp, releaseBranchWithPatchRegexp);
}
exports.hasMatchingReleaseTag = hasMatchingReleaseTag;
function filterRefNames(refNames, regexp) {
    return refNames.filter((name) => name.match(regexp));
}
exports.filterRefNames = filterRefNames;
function hasMatchingReleaseTagWithRefNames(refNames, refName, releaseTagRegexp, releaseBranchWithoutPatchRegexp, releaseBranchWithPatchRegexp) {
    if (refName.match(releaseTagRegexp)) {
        return 'true';
    }
    let releaseTags = filterRefNames(refNames, releaseTagRegexp);
    let branchMatches = refName.match(releaseBranchWithPatchRegexp);
    if (branchMatches) {
        for (var i = 0; i < releaseTags.length; i++) {
            let tagMatches = releaseTags[i].match(releaseTagRegexp);
            if (tagMatches &&
                tagMatches[1] == branchMatches[1] &&
                tagMatches[2] == branchMatches[2] &&
                tagMatches[3] == branchMatches[3]) {
                return 'true';
            }
        }
    }
    branchMatches = refName.match(releaseBranchWithoutPatchRegexp);
    if (branchMatches) {
        for (var i = 0; i < releaseTags.length; i++) {
            let tagMatches = releaseTags[i].match(releaseTagRegexp);
            if (tagMatches &&
                tagMatches[1] == branchMatches[1] &&
                tagMatches[2] == branchMatches[2] &&
                tagMatches[3] == '0') {
                return 'true';
            }
        }
    }
    return 'false';
}
exports.hasMatchingReleaseTagWithRefNames = hasMatchingReleaseTagWithRefNames;
//# sourceMappingURL=hasMatchingReleaseTag.js.map