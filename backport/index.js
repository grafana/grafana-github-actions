"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const backport_1 = require("./backport");
class Backport extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'Backport';
    }
    async onTriggered(octokit) {
        try {
            console.log('context', JSON.stringify(github_1.context, undefined, 2));
            const titleTemplate = core_1.getInput('titleTemplate');
            await backport_1.backport({
                labelsToAdd: [],
                payload: github_1.context.payload,
                titleTemplate,
                github: octokit,
                token: this.getToken(),
            });
        }
        catch (error) {
            core_1.error(error);
            core_1.setFailed(error.message);
        }
    }
}
new Backport().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map