"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { error as logError, getInput, setFailed } from '@actions/core'
const github_1 = require("@actions/github");
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
const git_1 = require("../common/git");
const versions_1 = require("./versions");
class BumpVersion extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'BumpVersion';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const token = this.getToken();
        await (0, git_1.cloneRepo)({ token, owner, repo });
        process.chdir(repo);
        if (!this.isCalledFromWorkflow()) {
            // Manually invoked the action
            const version = this.getVersion();
            const base = github_1.context.ref.substring(github_1.context.ref.lastIndexOf('/') + 1);
            await this.onTriggeredBase(octokit, base, version);
            return;
        }
        // Action invoked by a workflow
        const version_call = this.getVersion();
        const matches = (0, versions_1.getVersionMatch)(version_call);
        if (!matches || matches.length < 2) {
            throw new Error('The input version format is not correct, please respect major.minor.patch or major.minor.patch-beta{number} format. Example: 7.4.3 or 7.4.3-beta1');
        }
        let semantic_version = version_call;
        // if the milestone is beta
        if (matches[2] !== undefined) {
            // transform the milestone to use semantic versioning
            // i.e 8.2.3-beta1 --> 8.2.3-beta.1
            semantic_version = version_call.replace('-beta', '-beta.');
        }
        const base = `v${matches[1]}.x`;
        await this.onTriggeredBase(octokit, base, semantic_version);
    }
    async onTriggeredBase(octokit, base, version) {
        const { owner, repo } = github_1.context.repo;
        const prBranch = `bump-version-${version}`;
        // create branch
        await git('switch', base);
        await git('switch', '--create', prBranch);
        // Install dependencies so that we can run lerna et al. with the local
        // version:
        await (0, exec_1.exec)('yarn', ['install']);
        // Update version
        await (0, exec_1.exec)('npm', ['version', version, '--no-git-tag-version']);
        await (0, exec_1.exec)('yarn', [
            'run',
            'lerna',
            'version',
            version,
            '--no-push',
            '--no-git-tag-version',
            '--force-publish',
            '--exact',
            '--yes',
        ]);
        try {
            //regenerate yarn.lock file
            //await exec('npm', ['install', '-g', 'corepack'])
            await (0, exec_1.exec)('corepack', ['enable']);
            //await exec('yarn', ['set', 'version', '3.1.1'])
            await (0, exec_1.exec)('yarn', ['--version']);
            await (0, exec_1.exec)('yarn', ['install', '--mode', 'update-lockfile']);
        }
        catch (e) {
            console.error('yarn failed', e);
        }
        await git('commit', '-am', `"Release: Updated versions in package to ${version}"`);
        // push
        await git('push', '--set-upstream', 'origin', prBranch);
        const body = `Executed:\n
		npm version ${version} --no-git-tag-version\n
		yarn install\n
		yarn run lerna version ${version} --no-push --no-git-tag-version --force-publish --exact --yes\n
		yarn install --mode update-lockfile
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
    await (0, exec_1.exec)('git', args);
};
new BumpVersion().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map