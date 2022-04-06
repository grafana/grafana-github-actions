"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.map = void 0;
const semver_1 = require("semver");
let forcePrefix = 'v';
let knownRefs = new Map([['main', 'next']]);
// map the given git reference (branch or tag name) to the corresponding
// documentation subfolder, trimming any provided prefixes.
// The output will be "vMajor.Minor"
function map(ref, trimPrefixes) {
    // Hard-coded mapping?
    if (knownRefs.has(ref)) {
        return knownRefs.get(ref);
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
    return forcePrefix + ver.major + '.' + ver.minor;
}
exports.map = map;
//# sourceMappingURL=map.js.map