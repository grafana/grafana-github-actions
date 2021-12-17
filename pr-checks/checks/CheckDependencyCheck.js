"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckDependencyCheck = void 0;
const github_1 = require("@actions/github");
const _1 = require(".");
const Subscriber_1 = require("../Subscriber");
const types_1 = require("../types");
class CheckDependencyCheck extends _1.Check {
    constructor(check, config) {
        super();
        this.check = check;
        this.config = config;
        this.id = 'check-dependency-check';
        this.id += `/${this.config.title}`;
    }
    subscribe(s) {
        const depSubscriber = new Subscriber_1.Subscriber();
        this.check.subscribe(depSubscriber);
        const subscriptions = depSubscriber.subscriptions();
        for (let n = 0; n < subscriptions.length; n++) {
            const sub = subscriptions[n];
            s.on(sub.events, sub.actions, async (ctx) => {
                const issue = github_1.context.payload.issue;
                const pr = github_1.context.payload.pull_request;
                if (!issue?.pull_request && !pr) {
                    return;
                }
                let sha = '';
                if (github_1.context.payload.pull_request) {
                    sha = github_1.context.payload.pull_request.head.sha;
                }
                else {
                    const pr = await ctx.getAPI().getPullRequest();
                    sha = pr.headSHA;
                }
                const resp = await ctx.getAPI().listStatusesByRef(sha);
                for (let n = 0; n < resp.statuses.length; n++) {
                    const s = resp.statuses[n];
                    if (s.context === this.config.title) {
                        if (s.state === types_1.CheckState.Success) {
                            await sub.callback(ctx);
                        }
                        break;
                    }
                }
            });
        }
    }
}
exports.CheckDependencyCheck = CheckDependencyCheck;
//# sourceMappingURL=CheckDependencyCheck.js.map