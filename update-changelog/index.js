"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { error as logError, getInput, setFailed } from '@actions/core'
const github_1 = require("@actions/github");
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
const git_1 = require("../common/git");
const FileUpdater_1 = require("./FileUpdater");
const ChangelogBuilder_1 = require("./ChangelogBuilder");
const utils_1 = require("../common/utils");
const axios_1 = __importDefault(require("axios"));
class UpdateChangelog extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'UpdateChangelog';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const token = this.getToken();
        const version = this.getVersion();
        const versionSplitted = version.split('.');
        const versionMajorBranch = 'v' + versionSplitted[0] + '.' + versionSplitted[1] + '.' + 'x';
        await (0, git_1.cloneRepo)({ token, owner, repo });
        await (0, git_1.setConfig)('grafana-delivery-bot');
        process.chdir(repo);
        const fileUpdater = new FileUpdater_1.FileUpdater();
        const builder = new ChangelogBuilder_1.ChangelogBuilder(octokit, version);
        const changelogFile = './CHANGELOG.md';
        const branchName = 'update-changelog';
        const changelog = await builder.buildChangelog({ useDocsHeader: false });
        const title = `Changelog: Updated changelog for ${version}`;
        // Update main changelog
        fileUpdater.loadFile(changelogFile);
        fileUpdater.update({
            version: version,
            content: changelog,
        });
        fileUpdater.writeFile(changelogFile);
        await npx('prettier', '--no-config', '--trailing-comma', 'es5', '--single-quote', '--print-width', '120', '--list-different', '**/*.md', '--write');
        // look for the branch
        let branchExists;
        try {
            await git('ls-remote', '--heads', '--exit-code', `https://github.com/${owner}/${repo}.git`, branchName);
            branchExists = true;
        }
        catch (e) {
            branchExists = false;
        }
        // we delete the branch which also will delete the associated PR
        if (branchExists) {
            // check if there are open PR's
            const pulls = await octokit.octokit.pulls.list({
                owner,
                repo,
                head: `${owner}:${branchName}`,
            });
            // close open PRs
            for (const pull of pulls.data) {
                // leave a comment explaining why we're closing this PR
                await octokit.octokit.issues.createComment({
                    body: `This pull request has been closed because an updated changelog and release notes have been generated.`,
                    issue_number: pull.number,
                    owner,
                    repo,
                });
                // close pr
                await octokit.octokit.pulls.update({
                    owner,
                    repo,
                    pull_number: pull.number,
                    state: 'closed',
                });
            }
            // delete the branch
            await git('push', 'origin', '--delete', branchName);
        }
        await git('switch', '--create', branchName);
        await git('add', '-A');
        await git('commit', '-m', `${title}`);
        await git('push', '--set-upstream', 'origin', branchName);
        const pr = await octokit.octokit.pulls.create({
            base: 'main',
            body: 'This exciting! So much has changed!\nDO NOT CHANGE THE TITLES DIRECTLY IN THIS PR, everything in the PR is auto-generated.',
            head: branchName,
            owner,
            repo,
            title,
        });
        if (pr.data.number) {
            await octokit.octokit.issues.addLabels({
                issue_number: pr.data.number,
                owner,
                repo,
                labels: ['backport ' + versionMajorBranch, 'no-changelog'],
            });
        }
        // publish changelog to community.grafana.com
        try {
            const apiKey = (0, utils_1.getInput)('grafanabotForumKey');
            const forumData = {
                title: `Changelog: Updates in Grafana ${version}`,
                raw: `${changelog}`,
                category: 9,
            };
            await (0, axios_1.default)({
                url: 'https://community.grafana.com/posts.json',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Api-Key': `${apiKey}`,
                    'Api-Username': 'grafanabot',
                },
                data: JSON.stringify(forumData),
            });
        }
        catch (e) {
            console.log(e);
        }
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await (0, exec_1.exec)('git', args);
};
const npx = async (...args) => {
    await (0, exec_1.exec)('npx', args);
};
new UpdateChangelog().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map