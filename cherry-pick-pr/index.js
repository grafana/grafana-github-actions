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
            const titleTemplate = '[Cherry-pick to {{base}}] {{originalTitle}}';
            await backport_1.backport({
                labelsToAdd: [],
                payload: github_1.context.payload,
                titleTemplate,
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
new CherryPickPR().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map