"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneCheck = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
class MilestoneCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'milestone';
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['opened', 'reopened', 'ready_for_review', 'synchronize'], async (ctx) => {
            const pr = github_1.context.payload.pull_request;
            if (!pr) {
                return this.failure(ctx, '');
            }
            // This check is relevant only for PRs opened against some specific branches.
            // We can skip it if the base branch is not one of those.
            // If for any reason the base branch is not specified in the webhook event payload, we still run the check
            const versionBranchRegex = /v\d*\.\d*\.\d*.*/;
            if (pr.base?.ref && pr.base.ref !== 'main' && !versionBranchRegex.test(pr.base.ref)) {
                return this.success(ctx, pr.head.sha);
            }
            if (pr.milestone) {
                return this.success(ctx, pr.head.sha);
            }
            return this.failure(ctx, pr.head.sha);
        });
        s.on('issues', ['milestoned', 'demilestoned'], async (ctx) => {
            const issue = github_1.context.payload.issue;
            if (!issue || !issue.pull_request) {
                return;
            }
            if (issue.state !== 'open') {
                return;
            }
            const pr = await ctx.getAPI().getPullRequest();
            if (pr.milestoneId) {
                return this.success(ctx, pr.headSHA);
            }
            return this.failure(ctx, pr.headSHA);
        });
    }
    success(ctx, sha) {
        const title = this.config.title ?? 'Milestone Check';
        const description = this.config.success ?? 'Milestone set';
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    failure(ctx, sha) {
        const title = this.config.title ?? 'Milestone Check';
        const description = this.config.failure ?? 'Milestone not set';
        return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl });
    }
}
exports.MilestoneCheck = MilestoneCheck;
//# sourceMappingURL=MilestoneCheck.js.map