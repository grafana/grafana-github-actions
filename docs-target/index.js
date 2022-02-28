"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const utils_1 = require("../common/utils");
const core_2 = require("@actions/core");
let forcePrefix = 'v';
let trimPrefixes = ['release-', 'v'];
let knownRefs = new Map([['main', 'next']]);
function setTarget(target) {
    console.log('Output target: ' + target);
    (0, core_2.setOutput)('target', target);
}
function run() {
    try {
        var ref_name = (0, utils_1.getRequiredInput)('ref_name');
        console.log('Input ref_name: ' + ref_name);
        var target = knownRefs.get(ref_name);
        if (target != undefined) {
            setTarget(target);
            return;
        }
        trimPrefixes.forEach((prefix) => {
            if (ref_name.startsWith(prefix)) {
                ref_name = ref_name.slice(prefix.length);
            }
        });
        // The node semver package can't parse things like "x.y" without patch
        // https://github.com/npm/node-semver/issues/164#issuecomment-247157991
        // So doing cheap way to get major.minor
        let parts = ref_name.split('.', 2);
        if (parts.length != 2) {
            throw 'ref_name invalid: ' + ref_name;
        }
        target = forcePrefix + parts[0] + '.' + parts[1];
        setTarget(target);
    }
    catch (error) {
        (0, core_1.setFailed)(error);
    }
}
run();
//# sourceMappingURL=index.js.map