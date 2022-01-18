"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackportCheck = exports.defaultConfig = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
exports.defaultConfig = {
    title: 'Backport Check',
    backportEnabled: 'Backport enabled',
    backportSkipped: 'Backport skipped',
    failure: 'Backport decision needed',
};
const labelRegExp = /^backport ([^ ]+)(?: ([^ ]+))?$/;
class BackportCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'backport';
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'], async (ctx) => {
            const payload = github_1.context.payload;
            if (!payload) {
                return;
            }
            if (payload.pull_request.state !== 'open') {
                return;
            }
            for (let n = 0; n < payload.pull_request.labels.length; n++) {
                const existingLabel = payload.pull_request.labels[n];
                const matches = labelRegExp.exec(existingLabel.name);
                if (matches !== null) {
                    return this.successEnabled(ctx, payload.pull_request.head.sha);
                }
            }
            if (this.config.skipLabels) {
                for (let n = 0; n < payload.pull_request.labels.length; n++) {
                    const existingLabel = payload.pull_request.labels[n];
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
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.backportEnabled ?? exports.defaultConfig.backportEnabled;
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    successSkip(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.backportSkipped ?? exports.defaultConfig.backportSkipped;
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    failure(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.failure ?? exports.defaultConfig.failure;
        return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl });
    }
}
exports.BackportCheck = BackportCheck;
//# sourceMappingURL=BackportCheck.js.map