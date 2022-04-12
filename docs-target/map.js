"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.map = void 0;
const semver_1 = require("semver");
let forcePrefix = 'v';
let knownRefs = new Map([
    ['main', 'next'],
    ['master', 'next'],
]);
// map the given git reference (branch or tag name) to the corresponding
// documentation subfolder.
// The output will be "vMajor.Minor".
// The coercion performed is very permissive and most any reference will
// result in some output.
// All references that approximate semantic version, but deviate perhaps
// by having a prefix, should be coerced into a reasonable output.
function map(ref) {
    // Hard-coded mapping?
    if (knownRefs.has(ref)) {
        return knownRefs.get(ref);
    }
    var ver = (0, semver_1.coerce)(ref);
    if (ver == null) {
        throw 'ref_name invalid: ' + ref;
    }
    return forcePrefix + ver.major + '.' + ver.minor;
}
exports.map = map;
//# sourceMappingURL=map.js.map