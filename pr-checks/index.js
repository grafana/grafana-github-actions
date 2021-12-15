"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const octokit_1 = require("../api/octokit");
const utils_1 = require("../common/utils");
const Action_1 = require("../common/Action");
const checks_1 = require("./checks");
const Dispatcher_1 = require("./Dispatcher");
class PRChecksAction extends Action_1.ActionBase {
    constructor() {
        super(...arguments);
        this.id = 'PR Checks';
    }
    async runAction() {
        const issue = github_1.context?.issue?.number;
        if (!issue) {
            return;
        }
        const api = new octokit_1.OctoKitIssue(this.getToken(), github_1.context.repo, { number: issue });
        const dispatcher = new Dispatcher_1.Dispatcher(api);
        const config = await api.readConfig((0, utils_1.getRequiredInput)('configPath'));
        const checks = (0, checks_1.getChecks)(config);
        for (let n = 0; n < checks.length; n++) {
            const check = checks[n];
            console.debug('subscribing to check', check.id);
            check.subscribe(dispatcher);
        }
        await dispatcher.dispatch(github_1.context);
    }
}
new PRChecksAction().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map