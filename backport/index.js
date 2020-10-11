"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const backport_1 = require("./backport");
class CherryPickPR extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'CherryPickPR';
    }
    async onLabeled(issue, _label) {
        try {
            await backport_1.backport({
                labelsToAdd: exports.getLabelsToAdd(core_1.getInput('labelsToAdd')),
                payload: github_1.context.payload,
                titleTemplate: core_1.getInput('title'),
                github: issue.octokit,
                token: this.getToken(),
            });
        }
        catch (error) {
            core_1.error(error);
            core_1.setFailed(error.message);
        }
    }
}
exports.getLabelsToAdd = (input) => {
    if (input === undefined || input === '') {
        return [];
    }
    const labels = input.split(',');
    return labels.map((v) => v.trim()).filter((v) => v !== '');
};
new CherryPickPR().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map