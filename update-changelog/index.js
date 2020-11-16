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
        await git_1.cloneRepo({ token, owner, repo });
        process.chdir(repo);
        const fileUpdater = new FileUpdater_1.FileUpdater();
        const builder = new ReleaseNotesBuilder_1.ReleaseNotesBuilder(octokit);
        const changelogFile = './CHANGELOG.md';
        const branchName = 'update-changelog-and-relase-notes';
        const releaseNotes = await builder.buildReleaseNotes(version);
        const title = `ReleaseNotes: Updated changelog and release notes for ${version}`;
        fileUpdater.loadFile(changelogFile);
        fileUpdater.update({
            version: version,
            content: releaseNotes,
        });
        fileUpdater.writeFile(changelogFile);
        await git('switch', '--create', branchName);
        await git('commit', '-am', `"${title}`);
        await git('push', '--set-upstream', 'origin', branchName);
        await octokit.octokit.pulls.create({
            base: 'master',
            body: 'This exciting, so much has changed!',
            head: branchName,
            owner,
            repo,
            title,
        });
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await exec_1.exec('git', args);
};
new UpdateChangelog().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map