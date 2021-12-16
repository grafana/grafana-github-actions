"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackportCheck = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
const labelRegExp = /^backport ([^ ]+)(?: ([^ ]+))?$/;
class BackportCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'backport';
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['labeled', 'unlabeled'], async (ctx) => {
            const payload = github_1.context.payload;
            if (!payload.label) {
                return;
            }
            for (let n = 0; n < payload.pull_request.labels.length; n++) {
                const existingLabel = payload.pull_request.labels[n];
                const matches = labelRegExp.exec(existingLabel.name);
                if (matches !== null) {
                    return this.successEnabled(ctx, payload.pull_request.head.sha);
                }
                if (this.config.skipLabels) {
                    for (let n = 0; n < this.config.skipLabels.length; n++) {
                        const l = this.config.skipLabels[n];
                        if (l === existingLabel.name) {
                            return this.successSkip(ctx, payload.pull_request.head.sha);
                        }
                    }
                }
            }
            return this.failure(ctx, payload.pull_request.head.sha);
        });
    }
    successEnabled(ctx, sha) {
        const title = this.config.title ?? 'Backport Check';
        const description = this.config.backportEnabled ?? 'Backport enabled';
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    successSkip(ctx, sha) {
        const title = this.config.title ?? 'Backport Check';
        const description = this.config.backportSkipped ?? 'Backport skipped';
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    failure(ctx, sha) {
        const title = this.config.title ?? 'Backport Check';
        const description = this.config.failure ?? 'Backport decision needed';
        return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl });
    }
}
exports.BackportCheck = BackportCheck;
//# sourceMappingURL=BackportCheck.js.map