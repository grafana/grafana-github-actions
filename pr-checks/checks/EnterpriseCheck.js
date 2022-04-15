"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnterpriseCheck = exports.defaultConfig = void 0;
const github_1 = require("@actions/github");
const Check_1 = require("../Check");
exports.defaultConfig = {
    title: 'Enterprise Check',
    success: 'Enterprise build passed',
    enterpriseFailure: 'Enterprise build failed',
    noLabelFailure: 'Waiting for Enterprise build to complete',
    tooManyLabelsFailure: 'Too many enterprise-XX labels, only one should be set',
    override: 'Any failure in Enterprise build was ignored',
};
const EnterpriseOKLabel = 'enterprise-ok';
const EnterpriseOverrideLabel = 'enterprise-override';
const EnterpriseKOLabel = 'enterprise-ko';
const labelRegExp = /^enterprise-(ok|ko|override)$/;
class EnterpriseCheck extends Check_1.Check {
    constructor(config) {
        super();
        this.config = config;
        this.id = 'enterprise';
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
            let enterpriseLabel = '';
            const sha = payload.pull_request.head.sha;
            for (let n = 0; n < payload.pull_request.labels.length; n++) {
                const existingLabel = payload.pull_request.labels[n];
                const matches = labelRegExp.exec(existingLabel.name);
                if (matches !== null) {
                    if (enterpriseLabel === '') {
                        enterpriseLabel = matches[0];
                    }
                    else {
                        return this.response(ctx, sha, this.config.tooManyLabelsFailure ?? exports.defaultConfig.tooManyLabelsFailure, false);
                    }
                }
            }
            switch (enterpriseLabel) {
                case EnterpriseOKLabel:
                    return this.response(ctx, sha, this.config.success ?? exports.defaultConfig.success, true);
                case EnterpriseOverrideLabel:
                    return this.response(ctx, sha, this.config.override ?? exports.defaultConfig.override, true);
                case EnterpriseKOLabel:
                    return this.response(ctx, sha, this.config.enterpriseFailure ?? exports.defaultConfig.enterpriseFailure, false);
            }
            return this.response(ctx, sha, this.config.noLabelFailure ?? exports.defaultConfig.noLabelFailure, false);
        });
    }
    response(ctx, sha, description, isSuccess) {
        const title = this.config.title ?? exports.defaultConfig.title;
        if (isSuccess) {
            return ctx.success({ sha, title, description });
        }
        return ctx.failure({ sha, title, description });
    }
}
exports.EnterpriseCheck = EnterpriseCheck;
//# sourceMappingURL=EnterpriseCheck.js.map