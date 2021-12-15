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
        s.on(['pull_request', 'pull_request_target'], ['opened', 'synchronize'], async (ctx) => {
            const pr = github_1.context.payload.pull_request;
            if (pr && pr.milestone) {
                return this.success(ctx, pr.head.sha);
            }
            return this.failure(ctx, pr.head.sha);
        });
        s.on('issues', ['milestoned', 'demilestoned'], async (ctx) => {
            const issue = github_1.context.payload.issue;
            if (!issue.pull_request) {
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