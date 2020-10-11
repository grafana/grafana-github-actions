"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const backport_1 = require("./backport");
class Backporter extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'Backporter';
    }
    async onClosed(_issue) {
        console.log('context.payload', github_1.context.payload);
    }
    async onLabeled(issue) {
        try {
            console.log('context', JSON.stringify(github_1.context, undefined, 2));
            const titleTemplate = core_1.getInput('titleTemplate');
            await backport_1.backport({
                labelsToAdd: [],
                payload: github_1.context.payload,
                titleTemplate,
                issue,
                token: this.getToken(),
            });
        }
        catch (error) {
            core_1.error(error);
            core_1.setFailed(error.message);
        }
    }
}
new Backporter().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map