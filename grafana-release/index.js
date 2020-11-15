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
const fs_1 = __importDefault(require("fs"));
class GrafanaRelease extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'GrafanaRelease';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const token = this.getToken();
        const initialWorkingDir = process.cwd();
        console.log('initialWorkingDir', initialWorkingDir);
        await git_1.cloneRepo({ token, owner, repo });
        process.chdir(repo);
        console.log('currentWorkingDir', process.cwd());
        const base = 'main';
        const prBranch = 'patch';
        // create branch
        await git('switch', base);
        await git('switch', '--create', prBranch);
        // make changes
        let rawdata = fs_1.default.readFileSync('package.json');
        let packageJson = JSON.parse(rawdata.toString());
        console.log('packageJson', packageJson);
        packageJson.version = '2.0.0';
        fs_1.default.writeFile('package.json', JSON.stringify(packageJson), function writeJSON(err) {
            if (err)
                return console.log(err);
            console.log('writing package.json');
        });
        // commit
        await git('push', 'commit', '-am', 'Updated version');
        // push
        await git('push', '--set-upstream', 'origin', prBranch);
        // await git('switch', '--create', head)
        // try {
        // 	await git('cherry-pick', '-x', commitToBackport)
        // } catch (error) {
        // 	await git('cherry-pick', '--abort')
        // 	throw error
        // }
        // await git('push', '--set-upstream', 'origin', head)
        // const createRsp = await github.pulls.create({
        // 	base,
        // 	body,
        // 	head,
        // 	owner,
        // 	repo,
        // 	title,
        // })
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await exec_1.exec('git', args);
};
new GrafanaRelease().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map