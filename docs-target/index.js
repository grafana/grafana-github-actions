"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const utils_1 = require("../common/utils");
const semver_1 = require("semver");
let forcePrefix = 'v';
let trimPrefixes = ['release-', 'v'];
let knownRefs = new Map([['main', 'next']]);
function setTarget(target) {
    console.log('Output target: ' + target);
    (0, core_1.setOutput)('target', target);
}
function run() {
    try {
        var ref = (0, utils_1.getRequiredInput)('ref_name');
        console.log('Input ref_name: ' + ref);
        if (knownRefs.has(ref)) {
            setTarget(knownRefs.get(ref));
            return;
        }
        trimPrefixes.forEach((prefix) => {
            if (ref.startsWith(prefix)) {
                ref = ref.slice(prefix.length);
            }
        });
        var ver = (0, semver_1.coerce)(ref);
        if (ver == null) {
            throw 'ref_name invalid: ' + ref;
        }
        setTarget(forcePrefix + ver.major + '.' + ver.minor);
    }
    catch (error) {
        (0, core_1.setFailed)(error);
    }
}
run();
//# sourceMappingURL=index.js.map