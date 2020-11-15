"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { error as logError, getInput, setFailed } from '@actions/core'
const github_1 = require("@actions/github");
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
const git_1 = require("../common/git");
class BumpVersion extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'BumpVersion';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const token = this.getToken();
        const payload = github_1.context.payload;
        const version = payload.inputs.version;
        if (!version) {
            throw new Error('Missing version input');
        }
        await git_1.cloneRepo({ token, owner, repo });
        process.chdir(repo);
        const base = github_1.context.ref.substring(github_1.context.ref.lastIndexOf('/') + 1);
        const prBranch = `version-bump-${version}`;
        // create branch
        await git('switch', base);
        await git('switch', '--create', prBranch);
        // Update version
        await exec_1.exec('npm', ['version', version, '--no-git-tag-version']);
        await exec_1.exec('yarn', ['install', '--pure-lock-file']);
        await exec_1.exec('yarn', ['run', 'packages:prepare']);
        await git('commit', '-am', `"Release: Updated versions in package to ${version}"`);
        // push
        await git('push', '--set-upstream', 'origin', prBranch);
        const body = `
		  Bumps version to ${version}
		`;
        await octokit.octokit.pulls.create({
            base,
            body,
            head: prBranch,
            owner,
            repo,
            title: `Release: Bump version to ${version}`,
        });
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await exec_1.exec('git', args);
};
new BumpVersion().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map