"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChecks = void 0;
const BackportCheck_1 = require("./BackportCheck");
const MilestoneCheck_1 = require("./MilestoneCheck");
function getChecks(config) {
    const checks = [];
    for (let n = 0; n < config.length; n++) {
        const checkConfig = config[n];
        switch (checkConfig.type) {
            case 'check-milestone':
                checks.push(new MilestoneCheck_1.MilestoneCheck(checkConfig));
                break;
            case 'check-backport':
                checks.push(new BackportCheck_1.BackportCheck(checkConfig));
                break;
        }
    }
    return checks;
}
exports.getChecks = getChecks;
//# sourceMappingURL=index.js.map