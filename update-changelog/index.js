"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { error as logError, getInput, setFailed } from '@actions/core'
const github_1 = require("@actions/github");
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
const git_1 = require("../common/git");
const FileUpdater_1 = require("./FileUpdater");
const ReleaseNotesBuilder_1 = require("./ReleaseNotesBuilder");
const writeDocsFiles_1 = require("./writeDocsFiles");
class UpdateChangelog extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'UpdateChangelog';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const token = this.getToken();
        const payload = github_1.context.payload;
        const version = payload.inputs.version;
        if (!version) {
            throw new Error('Missing version input');
        }
        await (0, git_1.cloneRepo)({ token, owner, repo });
        process.chdir(repo);
        const fileUpdater = new FileUpdater_1.FileUpdater();
        const builder = new ReleaseNotesBuilder_1.ReleaseNotesBuilder(octokit, version);
        const changelogFile = './CHANGELOG.md';
        const branchName = 'update-changelog-and-release-notes';
        const releaseNotes = await builder.buildReleaseNotes({ useDocsHeader: false });
        const title = `ReleaseNotes: Updated changelog and release notes for ${version}`;
        // Update main changelog
        fileUpdater.loadFile(changelogFile);
        fileUpdater.update({
            version: version,
            content: releaseNotes,
        });
        fileUpdater.writeFile(changelogFile);
        await (0, writeDocsFiles_1.writeDocsFiles)({ version, builder });
        await npx('prettier', '--no-config', '--trailing-comma', 'es5', '--single-quote', '--print-width', '120', '--list-different', '**/*.md', '--write');
        // look for the branch
        const exitCode = await git('ls-remote', '--heads', '--exit-code', `https://github.com/${owner}/${repo}.git`, branchName);
        // if exitcode === 0 then branch does exist
        // we delete the branch which also will delete the associated PR
        if (exitCode === 0) {
            await git('push', 'origin', '--delete', branchName);
        }
        await git('switch', '--create', branchName);
        await git('add', '-A');
        await git('commit', '-m', `${title}`);
        await git('push', '--set-upstream', 'origin', branchName);
        await octokit.octokit.pulls.create({
            base: 'main',
            body: 'This exciting! So much has changed!\nDO NOT CHANGE THE TITLES DIRECTLY IN THIS PR, everything in the PR is auto-generated.',
            head: branchName,
            owner,
            repo,
            title,
        });
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    return await (0, exec_1.exec)('git', args);
};
const npx = async (...args) => {
    await (0, exec_1.exec)('npx', args);
};
new UpdateChangelog().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map