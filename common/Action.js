"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Action = exports.ActionBase = void 0;
const octokit_1 = require("../api/octokit");
const github_1 = require("@actions/github");
const utils_1 = require("./utils");
const core_1 = require("@actions/core");
const telemetry_1 = require("./telemetry");
const console_1 = require("console");
class ActionBase {
    constructor() {
        this.token = (0, utils_1.getRequiredInput)('token');
        this.username = new github_1.GitHub(this.getToken()).users.getAuthenticated().then((v) => v.data.name, () => 'unknown');
    }
    getToken() {
        return this.token;
    }
    getVersion() {
        const payload = github_1.context.payload;
        const version = payload.inputs.version;
        const version_call = (0, core_1.getInput)('version_call');
        if (version) {
            return version;
        }
        if (version_call) {
            return version_call;
        }
        throw new Error('Missing version input');
    }
    isCalledFromWorkflow() {
        return Boolean((0, core_1.getInput)('version_call'));
    }
    async run() {
        console.log('running ', this.id, 'with context', {
            ...github_1.context,
            payload: {
                issue: github_1.context.payload?.issue?.number,
                label: github_1.context.payload?.label?.name,
                repository: github_1.context.payload?.repository?.html_url,
                sender: github_1.context.payload?.sender?.login ?? github_1.context.payload?.sender?.type,
                action: github_1.context.payload.action,
                contextIssue: github_1.context.issue,
            },
        });
        if (utils_1.errorLoggingIssue) {
            const { repo, issue, owner } = utils_1.errorLoggingIssue;
            if (github_1.context.repo.repo === repo &&
                github_1.context.repo.owner === owner &&
                github_1.context.payload.issue?.number === issue) {
                return console.log('refusing to run on error logging issue to prevent cascading errors');
            }
        }
        try {
            await this.runAction();
        }
        catch (e) {
            if (e instanceof Error) {
                await this.error(e);
            }
        }
        await this.trackMetric({ name: 'octokit_request_count', value: (0, octokit_1.getNumRequests)() });
        const usage = await (0, utils_1.getRateLimit)(this.getToken());
        await this.trackMetric({ name: 'usage_core', value: usage.core });
        await this.trackMetric({ name: 'usage_graphql', value: usage.graphql });
        await this.trackMetric({ name: 'usage_search', value: usage.search });
    }
    async trackMetric(telemetry) {
        console.log('tracking metrics:', telemetry);
        if (telemetry_1.aiHandle) {
            telemetry_1.aiHandle.trackMetric(telemetry);
        }
    }
    async error(error) {
        (0, console_1.debug)('Error when running action: ', error);
        const details = {
            message: `${error.message}\n${error.stack}`,
            id: this.id,
            user: await this.username,
        };
        if (github_1.context.issue.number)
            details.issue = github_1.context.issue.number;
        const rendered = `
Message: ${details.message}

Actor: ${details.user}

ID: ${details.id}
`;
        await (0, utils_1.logErrorToIssue)(rendered, true, this.token);
        if (telemetry_1.aiHandle) {
            telemetry_1.aiHandle.trackException({ exception: error });
        }
        (0, core_1.setFailed)(error.message);
    }
}
exports.ActionBase = ActionBase;
class Action extends ActionBase {
    constructor() {
        super();
    }
    async runAction() {
        const readonly = !!(0, core_1.getInput)('readonly');
        const issue = github_1.context?.issue?.number;
        if (issue) {
            const octokit = new octokit_1.OctoKitIssue(this.getToken(), github_1.context.repo, { number: issue }, { readonly });
            switch (github_1.context.eventName) {
                case 'issue_comment':
                    await this.onCommented(octokit, github_1.context.payload.comment.body, github_1.context.actor);
                    break;
                case 'issues':
                case 'pull_request':
                case 'pull_request_target':
                    switch (github_1.context.payload.action) {
                        case 'opened':
                            await this.onOpened(octokit);
                            break;
                        case 'reopened':
                            await this.onReopened(octokit);
                            break;
                        case 'closed':
                            await this.onClosed(octokit);
                            break;
                        case 'labeled':
                            await this.onLabeled(octokit, github_1.context.payload.label.name);
                            break;
                        case 'unassigned':
                            await this.onUnassigned(octokit, github_1.context.payload.assignee.login);
                            break;
                        case 'edited':
                            await this.onEdited(octokit);
                            break;
                        case 'milestoned':
                            await this.onMilestoned(octokit);
                            break;
                        case 'demilestoned':
                            await this.onDemilestoned(octokit);
                            break;
                        case 'synchronize':
                            await this.onSynchronized(octokit);
                            break;
                        case 'unlabeled':
                            await this.onUnlabeled(octokit, github_1.context.payload.label.name);
                            break;
                        default:
                            throw Error('Unexpected action: ' + github_1.context.payload.action);
                    }
            }
        }
        else {
            await this.onTriggered(new octokit_1.OctoKit(this.getToken(), github_1.context.repo, { readonly }));
        }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onTriggered(_octokit) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onEdited(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onLabeled(_issue, _label) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onUnlabeled(_issue, _label) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onUnassigned(_issue, _label) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onOpened(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onReopened(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onClosed(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onMilestoned(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onDemilestoned(_issue) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onCommented(_issue, _comment, _actor) {
        throw Error('not implemented');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async onSynchronized(_issue) {
        throw Error('not implemented');
    }
}
exports.Action = Action;
//# sourceMappingURL=Action.js.map