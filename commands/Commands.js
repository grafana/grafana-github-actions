"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.Commands = void 0;
const globmatcher_1 = require("../common/globmatcher");
const telemetry_1 = require("../common/telemetry");
const utils_1 = require("../common/utils");
/* eslint-enable */
class Commands {
    constructor(github, config, action) {
        this.github = github;
        this.config = config;
        this.action = action;
    }
    async matches(command, issue, changedFiles) {
        if (command.requireLabel && !issue.labels.includes(command.requireLabel)) {
            return false;
        }
        if (command.disallowLabel && issue.labels.includes(command.disallowLabel)) {
            return false;
        }
        if ('comment' in this.action) {
            return (command.type === 'comment' &&
                !!this.action.comment.match(new RegExp(`(/|\\\\)${escapeRegExp(command.name)}(\\s|$)`, 'i')) &&
                ((await this.github.hasWriteAccess(this.action.user)) ||
                    command.allowUsers.includes(this.action.user.name) ||
                    command.allowUsers.includes('*') ||
                    (this.action.user.name === issue.author.name && command.allowUsers.includes('@author'))));
        }
        if (command.type === 'changedfiles' && command.matches) {
            if (!command.name) {
                command.name = 'changedfiles';
            }
            let matchCfg = {
                all: undefined,
                any: undefined,
            };
            if (typeof command.matches === 'string') {
                matchCfg.any = [command.matches];
            }
            else if ('any' in command.matches) {
                matchCfg.any = command.matches.any;
            }
            else if ('all' in command.matches) {
                matchCfg.all = command.matches.all;
            }
            else {
                matchCfg.any = command.matches;
            }
            return (0, globmatcher_1.checkMatch)(changedFiles, matchCfg);
        }
        if (command.type === 'author') {
            const labelPropExists = command.noLabels;
            const issueHasLabel = issue.labels.length > 0;
            if (labelPropExists && issueHasLabel) {
                return 'noLabels' in command ? false : true;
            }
            if (labelPropExists && !issueHasLabel && command.comment) {
                command.comment = '@' + issue.author.name + command.comment;
            }
            const org = command.memberOf?.org || command.notMemberOf?.org;
            if (command.ignoreList?.length && command.ignoreList.includes(issue.author.name)) {
                return false;
            }
            if (org) {
                const isMember = await this.github.isUserMemberOfOrganization(org, issue.author.name);
                return 'memberOf' in command ? isMember : !isMember;
            }
        }
        if ('label' in this.action && command.type === 'label' && this.action.label === command.name) {
            return true;
        }
        // If the command is a label, the issue has the label and the action is addToProject, execute the command
        // This is to allow the pipeline to add multiple projects at once based on all the issue labels
        if (command.type === 'label' &&
            command.action === 'addToProject' &&
            issue.labels.includes(command.name)) {
            return true;
        }
        return false;
    }
    async perform(command, issue, changedFiles) {
        console.debug('Would try to perform command:', command, ' on issue:', issue);
        if (!(await this.matches(command, issue, changedFiles))) {
            console.debug('Command ', JSON.stringify(command), ' did not match any criteria');
            return;
        }
        console.log('Running command', command);
        await (0, telemetry_1.trackEvent)(this.github, 'command', { name: command.name });
        const tasks = [];
        if ('comment' in this.action && (command.name === 'label' || command.name === 'assign')) {
            const args = [];
            let argList = (this.action.comment.match(new RegExp(String.raw `(?:\\|/)${command.name}(.*)(?:\r)?(?:\n|$)`))?.[1] ?? '').trim();
            while (argList) {
                const task = argList[0] === '-' ? 'remove' : 'add';
                if (task === 'remove')
                    argList = argList.slice(1);
                if (argList[0] === '"') {
                    const endIndex = argList.indexOf('"', 1);
                    if (endIndex === -1)
                        throw Error('Unable to parse arglist. Could not find matching double quote');
                    args.push({ task, name: argList.slice(1, endIndex) });
                    argList = argList.slice(endIndex + 1).trim();
                }
                else {
                    const endIndex = argList.indexOf(' ', 1);
                    if (endIndex === -1) {
                        args.push({ task, name: argList });
                        argList = '';
                    }
                    else {
                        args.push({ task, name: argList.slice(0, endIndex) });
                        argList = argList.slice(endIndex + 1).trim();
                    }
                }
            }
            if (command.name === 'label') {
                tasks.push(...args.map((arg) => arg.task === 'add'
                    ? this.github.addLabel(arg.name)
                    : this.github.removeLabel(arg.name)));
            }
            if (command.name === 'assign') {
                tasks.push(...args.map((arg) => arg.task === 'add'
                    ? this.github.addAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name)
                    : this.github.removeAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name)));
            }
        }
        if (command.action === 'close') {
            tasks.push(this.github.closeIssue());
        }
        if (command.comment && (command.action !== 'close' || issue.open)) {
            tasks.push(this.github.postComment(command.comment));
        }
        if (command.addLabel) {
            tasks.push(this.github.addLabel(command.addLabel));
        }
        if (command.removeLabel) {
            tasks.push(this.github.removeLabel(command.removeLabel));
        }
        if (command.action === 'addToProject' &&
            command.addToProject &&
            command.addToProject.url &&
            (command.name === 'changedfiles' || issue.labels.includes(command.name))) {
            const projectId = (0, utils_1.getProjectIdFromUrl)(command.addToProject.url);
            if (projectId) {
                tasks.push(this.github.addIssueToProject(projectId, issue, command.addToProject.org, command.addToProject.column));
            }
            else {
                console.debug('Could not parse project id from the provided URL', command.addToProject.url);
            }
        }
        if (command.action === 'removeFromProject' &&
            command.removeFromProject &&
            command.removeFromProject.url &&
            'label' in this.action &&
            this.action.label === command.name &&
            !issue.labels.includes(command.name)) {
            const projectId = (0, utils_1.getProjectIdFromUrl)(command.removeFromProject.url);
            if (projectId) {
                tasks.push(this.github.removeIssueFromProject(projectId, issue, command.removeFromProject.org));
            }
            else {
                console.debug('Could not parse project id from the provided URL', command.removeFromProject.url);
            }
        }
        await Promise.all(tasks);
    }
    async run() {
        const issue = await this.github.getIssue();
        let changedFiles = [];
        if (this.config.find((cmd) => cmd.type === 'changedfiles') !== undefined) {
            console.log('Found changedfiles commands, listing pull request filenames...');
            changedFiles = await this.github.listPullRequestFilenames();
        }
        console.debug('----- Current Commands configuration -----');
        console.debug(this.config);
        console.debug('----- End of Commands configuration -----');
        return Promise.all(this.config.map((command) => this.perform(command, issue, changedFiles)));
    }
}
exports.Commands = Commands;
// From user CoolAJ86 on https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
//# sourceMappingURL=Commands.js.map