"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChecks = void 0;
const MilestoneCheck_1 = require("./MilestoneCheck");
function getChecks(config) {
    const checks = [];
    for (let n = 0; n < config.length; n++) {
        const checkConfig = config[n];
        switch (checkConfig.type) {
            case 'check-milestone':
                checks.push(new MilestoneCheck_1.MilestoneCheck(checkConfig));
        }
    }
    return checks;
}
exports.getChecks = getChecks;
//# sourceMappingURL=index.js.map