"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChecks = void 0;
const ChangelogCheck_1 = require("./ChangelogCheck");
const LabelCheck_1 = require("./LabelCheck");
const MilestoneCheck_1 = require("./MilestoneCheck");
function getChecks(config) {
    const checks = [];
    for (let n = 0; n < config.length; n++) {
        const checkConfig = config[n];
        switch (checkConfig.type) {
            case 'check-milestone':
                checks.push(new MilestoneCheck_1.MilestoneCheck(checkConfig));
                break;
            case 'check-label':
                checks.push(new LabelCheck_1.LabelCheck(checkConfig));
                break;
            case 'check-changelog':
                checks.push(new ChangelogCheck_1.ChangelogCheck(checkConfig));
                break;
        }
    }
    return checks;
}
exports.getChecks = getChecks;
//# sourceMappingURL=index.js.map