"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MilestoneCheck = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
class MilestoneCheck extends Check_1.Check {
    constructor() {
        super(...arguments);
        this.id = 'milestone';
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['opened', 'synchronized'], async (ctx) => {
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
            const pr = await ctx.getPullRequest();
            if (pr.milestoneId) {
                return this.success(ctx, pr.headSHA);
            }
            return this.failure(ctx, pr.headSHA);
        });
    }
    success(ctx, sha) {
        const config = ctx.getConfig()[this.id];
        const title = config.title ?? 'Milestone Check';
        const description = config.success ?? 'Milestone set';
        return ctx.success({ sha, title, description, targetURL: config.targetURL });
    }
    failure(ctx, sha) {
        const config = ctx.getConfig()[this.id];
        const title = config.title ?? 'Milestone Check';
        const description = config.failure ?? 'Milestone not set';
        return ctx.failure({ sha, title, description, targetURL: config.targetURL });
    }
}
exports.MilestoneCheck = MilestoneCheck;
//# sourceMappingURL=MilestoneCheck.js.map