"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Checks = exports.CheckState = void 0;
const github_1 = require("@actions/github");
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
        let result;
        if (github_1.context.eventName === 'pull_request') {
            result = await this.handlePullRequestEvent();
        }
        if (github_1.context.eventName === 'issues') {
            result = await this.handleIssueEvent();
        }
        if (result) {
            console.log('got check result', result);
            let description = result.description ?? '';
            let targetURL = check.targetUrl ?? result.targetURL;
            if (result.state === CheckState.Failure) {
                description = check.failure ?? description;
            }
            if (result.state === CheckState.Success) {
                description = check.success ?? description;
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
exports.Checks = Checks;
//# sourceMappingURL=Checks.js.map