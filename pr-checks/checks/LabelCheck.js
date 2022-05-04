"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringMatchesLabel = exports.LabelCheck = exports.defaultConfig = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
exports.defaultConfig = {
    title: 'Label Check',
    exists: 'Check success',
    notExists: `Check failure`,
    skipped: 'Check skipped',
};
class LabelCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'label';
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'], async (ctx) => {
            await this.runCheck(ctx);
        });
    }
    async runCheck(ctx) {
        const payload = github_1.context.payload;
        if (!payload) {
            return;
        }
        if (payload.pull_request.state !== 'open') {
            return;
        }
        for (let n = 0; n < payload.pull_request.labels.length; n++) {
            const existingLabel = payload.pull_request.labels[n];
            for (let i = 0; i < this.config.labels.matches.length; i++) {
                if (stringMatchesLabel(this.config.labels.matches[i], existingLabel.name)) {
                    return this.successEnabled(ctx, payload.pull_request.head.sha);
                }
            }
        }
        if (this.config.skip) {
            for (let n = 0; n < payload.pull_request.labels.length; n++) {
                const existingLabel = payload.pull_request.labels[n];
                for (let i = 0; i < this.config.skip.matches.length; i++) {
                    if (stringMatchesLabel(this.config.skip.matches[i], existingLabel.name)) {
                        return this.successSkip(ctx, payload.pull_request.head.sha);
                    }
                }
            }
        }
        return this.failure(ctx, payload.pull_request.head.sha);
    }
    successEnabled(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.labels.exists ?? exports.defaultConfig.exists;
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    successSkip(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.skip?.message ?? exports.defaultConfig.skipped;
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    failure(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = this.config.labels.notExists ?? exports.defaultConfig.notExists;
        return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl });
    }
}
exports.LabelCheck = LabelCheck;
function stringMatchesLabel(str, label) {
    str = str.trim();
    if (str === '') {
        return false;
    }
    if (str === '*') {
        return true;
    }
    const lastAnyCharIndex = str.lastIndexOf('*');
    return (lastAnyCharIndex !== -1 && label.startsWith(str.substring(0, lastAnyCharIndex))) || str === label;
}
exports.stringMatchesLabel = stringMatchesLabel;
//# sourceMappingURL=LabelCheck.js.map