"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLabelsToAdd = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const backport_1 = require("./backport");
class Backport extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'Backport';
    }
    async onClosed(issue) {
        return this.backport(issue);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onLabeled(issue, _label) {
        return this.backport(issue);
    }
    async backport(issue) {
        try {
            await (0, backport_1.backport)({
                issue,
                labelsToAdd: (0, exports.getLabelsToAdd)((0, core_1.getInput)('labelsToAdd')),
                payload: github_1.context.payload,
                titleTemplate: (0, core_1.getInput)('title'),
                removeDefaultReviewers: (0, core_1.getBooleanInput)('removeDefaultReviewers'),
                github: issue.octokit,
                token: this.getToken(),
                sender: github_1.context.payload.sender,
            });
        }
        catch (error) {
            if (error instanceof Error) {
                (0, core_1.error)(error);
                (0, core_1.setFailed)(error.message);
            }
        }
    }
}
const getLabelsToAdd = (input) => {
    if (input === undefined || input === '') {
        return [];
    }
    const labels = input.split(',');
    return labels.map((v) => v.trim()).filter((v) => v !== '');
};
exports.getLabelsToAdd = getLabelsToAdd;
new Backport().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map