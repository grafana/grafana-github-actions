"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
const git_1 = require("../common/git");
const FileUpdater_1 = require("./FileUpdater");
class UpdateLatestVersion extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'UpdateLatestVersion';
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
        const latestVersionFile = './latest.json';
        const branchName = 'update-latest-version';
        const title = `Chore: updated latest.json to ${version}`;
        fileUpdater.loadFile(latestVersionFile);
        fileUpdater.update({
            version: version,
        });
        fileUpdater.writeFile(latestVersionFile);
        await git('switch', '--create', branchName);
        await git('add', '-A');
        await git('commit', '-m', `${title}`);
        await git('push', '--set-upstream', 'origin', branchName);
        await octokit.octokit.pulls.create({
            base: 'main',
            body: 'Update latest.json',
            head: branchName,
            owner,
            repo,
            title,
        });
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await (0, exec_1.exec)('git', args);
};
new UpdateLatestVersion().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map