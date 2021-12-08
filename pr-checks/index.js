"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckState = void 0;
const utils_1 = require("../common/utils");
const Action_1 = require("../common/Action");
const github_1 = require("@actions/github");
class PRChecksAction extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'PR Checks';
    }
    async onOpened(issue) {
        await this.onAction(issue);
    }
    async onMilestoned(issue) {
        await this.onAction(issue);
    }
    async onDemilestoned(issue) {
        await this.onAction(issue);
    }
    async onSynchronized(issue) {
        await this.onAction(issue);
    }
    async onAction(issue) {
        const config = await issue.readConfig(utils_1.getRequiredInput('configPath'));
        await new Checks(issue, config).run();
    }
}
var CheckState;
(function (CheckState) {
    CheckState["Error"] = "error";
    CheckState["Failure"] = "failure";
    CheckState["Pending"] = "pending";
    CheckState["Success"] = "success";
})(CheckState = exports.CheckState || (exports.CheckState = {}));
class Checks {
    constructor(github, config) {
        this.github = github;
        this.config = config;
    }
    async run() {
        const checkMilestone = this.config.find((c) => c.type === 'check-milestone');
        if (checkMilestone) {
            console.log('running check-milestone check');
            await this.checkMilestone(checkMilestone);
        }
    }
    async checkMilestone(check) {
        var _a, _b, _c, _d;
        let result;
        if (github_1.context.eventName === 'pull_request') {
            result = await this.handlePullRequestEvent();
        }
        if (github_1.context.eventName === 'issues') {
            result = await this.handleIssueEvent();
        }
        if (result) {
            console.log('got check result', result);
            let description = (_a = result.description) !== null && _a !== void 0 ? _a : '';
            let targetURL = (_b = check.targetUrl) !== null && _b !== void 0 ? _b : result.targetURL;
            if (result.state === CheckState.Failure) {
                description = (_c = check.failure) !== null && _c !== void 0 ? _c : description;
            }
            if (result.state === CheckState.Success) {
                description = (_d = check.success) !== null && _d !== void 0 ? _d : description;
            }
            await this.github.createStatus(result.sha, check.title, result.state, description, targetURL);
        }
    }
    async handlePullRequestEvent() {
        const pr = github_1.context.payload.pull_request;
        if (pr && pr.milestone) {
            return this.success(pr.head.sha);
        }
        return this.failure(pr.head.sha);
    }
    async handleIssueEvent() {
        const issue = github_1.context.payload.issue;
        if (!issue.pull_request) {
            return this.skip();
        }
        const pr = await this.github.getPullRequest();
        if (pr.milestoneId) {
            return this.success(pr.headSHA);
        }
        return this.failure(pr.headSHA);
    }
    failure(sha) {
        return {
            description: 'Milestone not set',
            state: CheckState.Failure,
            sha: sha,
        };
    }
    success(sha) {
        return {
            description: 'Milestone set',
            state: CheckState.Success,
            sha,
        };
    }
    skip() {
        return undefined;
    }
}
new PRChecksAction().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map