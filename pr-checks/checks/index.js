"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withDependencies = exports.getChecks = exports.Check = void 0;
const BackportCheck_1 = require("./BackportCheck");
const Check_1 = require("./Check");
Object.defineProperty(exports, "Check", { enumerable: true, get: function () { return Check_1.Check; } });
const CheckDependencyCheck_1 = require("./CheckDependencyCheck");
const MilestoneCheck_1 = require("./MilestoneCheck");
function getChecks(config) {
    const checks = [];
    for (let n = 0; n < config.length; n++) {
        const checkConfig = config[n];
        switch (checkConfig.type) {
            case 'check-milestone':
                checks.push(withDependencies(new MilestoneCheck_1.MilestoneCheck(checkConfig), checkConfig.dependencies));
                break;
            case 'check-backport':
                checks.push(withDependencies(new BackportCheck_1.BackportCheck(checkConfig), checkConfig.dependencies));
                break;
        }
    }
    return checks;
}
exports.getChecks = getChecks;
function withDependencies(check, deps) {
    if (!deps || deps.length === 0) {
        return check;
    }
    const dep = deps[0];
    if (dep.type === 'status-check') {
        return new CheckDependencyCheck_1.CheckDependencyCheck(check, dep);
    }
    return check;
}
exports.withDependencies = withDependencies;
//# sourceMappingURL=index.js.map