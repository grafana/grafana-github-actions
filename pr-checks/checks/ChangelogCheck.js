"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.containsBreakingChangeNotice = exports.isTitleValid = exports.ChangelogCheck = exports.defaultConfig = exports.defaultChangelogLabelCheckConfig = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
const types_1 = require("../types");
const LabelCheck_1 = require("./LabelCheck");
exports.defaultChangelogLabelCheckConfig = {
    title: 'Changelog Check',
    exists: 'Changelog enabled',
    notExists: `Changelog decision needed`,
    skipped: 'Changelog skipped',
};
exports.defaultConfig = {
    title: exports.defaultChangelogLabelCheckConfig.title,
    valid: 'Validation passed',
    invalidTitle: 'PR title formatting is invalid',
    breakingChangeNoticeMissing: 'Breaking change notice is missing',
};
class ChangelogCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'changelog';
        this.changelogLabelCheck = new LabelCheck_1.LabelCheck({
            title: this.config.title ?? exports.defaultChangelogLabelCheckConfig.title,
            targetUrl: this.config.targetUrl,
            labels: {
                ...this.config.labels,
                exists: this.config.labels.exists ?? exports.defaultChangelogLabelCheckConfig.exists,
                notExists: this.config.labels.notExists ?? exports.defaultChangelogLabelCheckConfig.notExists,
            },
            skip: this.config.skip
                ? {
                    matches: this.config.skip.matches,
                    message: this.config.skip.message ?? exports.defaultChangelogLabelCheckConfig.skipped,
                }
                : undefined,
        });
        this.breakingChangeLabelCheck = new LabelCheck_1.LabelCheck({
            title: this.config.title ?? exports.defaultChangelogLabelCheckConfig.title,
            labels: {
                matches: this.config.breakingChangeLabels ?? [],
            },
        });
    }
    subscribe(s) {
        s.on(['pull_request', 'pull_request_target'], ['edited', 'labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'], async (ctx) => {
            const payload = github_1.context.payload;
            if (!payload) {
                return;
            }
            await this.changelogLabelCheck.runCheck(ctx);
            const changelogEnabled = ctx.getResult();
            if (!changelogEnabled ||
                changelogEnabled.state !== types_1.CheckState.Success ||
                changelogEnabled.description?.indexOf(this.config.labels.exists ?? exports.defaultChangelogLabelCheckConfig.exists) === -1) {
                return;
            }
            if (!isTitleValid(payload.pull_request.title)) {
                return this.failure(ctx, exports.defaultConfig.invalidTitle, payload.pull_request.head.sha);
            }
            if (this.config.breakingChangeLabels && this.config.breakingChangeLabels.length > 0) {
                ctx.reset();
                await this.breakingChangeLabelCheck.runCheck(ctx);
                const breakingChangeEnabled = ctx.getResult();
                if (breakingChangeEnabled &&
                    breakingChangeEnabled.state === types_1.CheckState.Success &&
                    !containsBreakingChangeNotice(payload.pull_request.body)) {
                    return this.failure(ctx, exports.defaultConfig.breakingChangeNoticeMissing, payload.pull_request.head.sha);
                }
            }
            return this.success(ctx, payload.pull_request.head.sha);
        });
    }
    success(ctx, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = `${this.config.labels.exists ?? exports.defaultChangelogLabelCheckConfig.exists} - ${exports.defaultConfig.valid}`;
        return ctx.success({ sha, title, description, targetURL: this.config.targetUrl });
    }
    failure(ctx, reason, sha) {
        const title = this.config.title ?? exports.defaultConfig.title;
        const description = `${this.config.labels.exists ?? exports.defaultChangelogLabelCheckConfig.exists} - ${reason}`;
        return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl });
    }
}
exports.ChangelogCheck = ChangelogCheck;
const titleRegExp = /^[\s]*(\[.+][\s])?[A-Z]{1}[a-zA-Z0-9\s/]+:[\s]{1}[A-Z]{1}.*$/;
function isTitleValid(title) {
    title = title.trim();
    const matches = titleRegExp.exec(title);
    return matches !== null;
}
exports.isTitleValid = isTitleValid;
const breakingChangeNoticeRegExp = /# Release notice breaking change/m;
function containsBreakingChangeNotice(str) {
    const matches = breakingChangeNoticeRegExp.exec(str);
    return matches !== null;
}
exports.containsBreakingChangeNotice = containsBreakingChangeNotice;
//# sourceMappingURL=ChangelogCheck.js.map