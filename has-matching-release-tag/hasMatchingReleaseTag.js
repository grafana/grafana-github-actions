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
exports.hasMatchingReleaseTagWithRefNames = exports.filterRefNames = exports.hasMatchingReleaseTag = void 0;
const core = __importStar(require("@actions/core"));
const child_process_1 = require("child_process");
const utils_1 = require("../common/utils");
function hasMatchingReleaseTag(refName, releaseTagRegexp, releaseBranchRegexp, releaseBranchWithPatchRegexp) {
    let refNames = (0, utils_1.splitStringIntoLines)((0, child_process_1.execFileSync)('git', ['tag'], { encoding: 'utf8' })).filter((e) => e);
    if (refNames.length == 0) {
        core.warning('No tags found. Is there an `actions/checkout` step with `fetch-depth: 0` before this action? https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches');
    }
    core.debug(`Found the following references:\n${refNames.join('\n')}`);
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
        core.notice(`Reference name is a release tag`);
        return 'true';
    }
    let releaseTags = filterRefNames(refNames, releaseTagRegexp);
    core.debug(`The following release tags match the release tag regular expression ${releaseTagRegexp}:\n${releaseTags.join('\n')}`);
    let branchMatches = refName.match(releaseBranchRegexp);
    if (branchMatches) {
        for (let i = 0; i < releaseTags.length; i++) {
            let tagMatches = releaseTags[i].match(releaseTagRegexp);
            if (tagMatches &&
                tagMatches[1] == branchMatches[1] &&
                tagMatches[2] == branchMatches[2] &&
                tagMatches[3].match(new RegExp('0|[1-9]d*'))) {
                core.notice(`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`);
                return 'true';
            }
        }
    }
    if (releaseBranchWithPatchRegexp) {
        branchMatches = refName.match(releaseBranchWithPatchRegexp);
        if (branchMatches) {
            for (let i = 0; i < releaseTags.length; i++) {
                let tagMatches = releaseTags[i].match(releaseTagRegexp);
                if (tagMatches &&
                    tagMatches[1] == branchMatches[1] &&
                    tagMatches[2] == branchMatches[2] &&
                    tagMatches[3] == branchMatches[3]) {
                    core.notice(`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`);
                    return 'true';
                }
            }
        }
    }
    core.notice(`Did not find a corresponding release tag for reference '${refName}'`);
    return 'false';
}
exports.hasMatchingReleaseTagWithRefNames = hasMatchingReleaseTagWithRefNames;
//# sourceMappingURL=hasMatchingReleaseTag.js.map