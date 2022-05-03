"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasMatchingReleaseTagWithRefNames = exports.filterRefNames = exports.hasMatchingReleaseTag = void 0;
const child_process_1 = require("child_process");
const utils_1 = require("../common/utils");
function hasMatchingReleaseTag(refName, releaseTagRegexp, releaseBranchRegexp, releaseBranchWithPatchRegexp) {
    let refNames = (0, utils_1.splitStringIntoLines)((0, child_process_1.execFileSync)('git', ['tag'], { encoding: 'utf8' }));
    if (refNames.length == 0) {
        throw 'No tags found. Is there an `actions/checkout` step with `fetch-depth: 0` before this action? https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches';
    }
    return hasMatchingReleaseTagWithRefNames(refNames, refName, releaseTagRegexp, releaseBranchRegexp, releaseBranchWithPatchRegexp);
}
exports.hasMatchingReleaseTag = hasMatchingReleaseTag;
function filterRefNames(refNames, regexp) {
    return refNames.filter((name) => name.match(regexp));
}
exports.filterRefNames = filterRefNames;
// hasMatchingReleaseTagWithRefNames returns either the string "true" or "false".
// "true" is returned for each of the following cases:
// - releaseTagRegexp matches refName and is therefore a release tag reference name.
// - releaseBranchRegexp matches refName and there is a corresponding reference name in
//   refNames that matched by releaseTagRegexp. For a reference name to be corresponding,
//   it must share the major and minor versions with refName, and it must have a '0'
//   patch version.
// - releaseBranchWithPatchRegexp is defined, matches refName, and there is a corresponding
//   reference name in matched by releaseTagRegexp. For a reference name to be corresponding,
//   it must share the major, minor, and patch versions with the refName.
// Otherwise, the function returns "false".
function hasMatchingReleaseTagWithRefNames(refNames, refName, releaseTagRegexp, releaseBranchRegexp, releaseBranchWithPatchRegexp) {
    if (refName.match(releaseTagRegexp)) {
        console.log(`Reference name is a release tag`);
        return 'true';
    }
    let releaseTags = filterRefNames(refNames, releaseTagRegexp);
    let branchMatches = refName.match(releaseBranchRegexp);
    if (branchMatches) {
        for (var i = 0; i < releaseTags.length; i++) {
            let tagMatches = releaseTags[i].match(releaseTagRegexp);
            if (tagMatches &&
                tagMatches[1] == branchMatches[1] &&
                tagMatches[2] == branchMatches[2] &&
                tagMatches[3] == '0') {
                console.log(`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`);
                return 'true';
            }
        }
    }
    if (releaseBranchWithPatchRegexp) {
        branchMatches = refName.match(releaseBranchWithPatchRegexp);
        if (branchMatches) {
            for (var i = 0; i < releaseTags.length; i++) {
                let tagMatches = releaseTags[i].match(releaseTagRegexp);
                if (tagMatches &&
                    tagMatches[1] == branchMatches[1] &&
                    tagMatches[2] == branchMatches[2] &&
                    tagMatches[3] == branchMatches[3]) {
                    console.log(`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`);
                    return 'true';
                }
            }
        }
    }
    console.log(`Found corresponding release tag for reference '${refName}'`);
    return 'false';
}
exports.hasMatchingReleaseTagWithRefNames = hasMatchingReleaseTagWithRefNames;
//# sourceMappingURL=hasMatchingReleaseTag.js.map