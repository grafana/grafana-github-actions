"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { error as logError, getInput, setFailed } from '@actions/core'
const github_1 = require("@actions/github");
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
const Action_1 = require("../common/Action");
const exec_1 = require("@actions/exec");
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
        console.log({ version, other: payload.inputs.version_call });
        // 		if (!version) {
        // 			throw new Error('Missing version input')
        // 		}
        // 		await cloneRepo({ token, owner, repo })
        // 		process.chdir(repo)
        // 		const base = context.ref.substring(context.ref.lastIndexOf('/') + 1)
        // 		const prBranch = `bump-version-${version}`
        // 		// create branch
        // 		await git('switch', base)
        // 		await git('switch', '--create', prBranch)
        // 		// Update version
        // 		await exec('npm', ['version', version, '--no-git-tag-version'])
        // 		await exec('npx', [
        // 			'lerna',
        // 			'version',
        // 			version,
        // 			'--no-push',
        // 			'--no-git-tag-version',
        // 			'--force-publish',
        // 			'--exact',
        // 			'--yes',
        // 		])
        // 		try {
        // 			//regenerate yarn.lock file
        // 			await exec('yarn', undefined, { env: { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' } })
        // 		} catch (e) {
        // 			console.error('yarn failed', e)
        // 		}
        // 		await git('commit', '-am', `"Release: Updated versions in package to ${version}"`)
        // 		// push
        // 		await git('push', '--set-upstream', 'origin', prBranch)
        // 		const body = `Executed:\n
        // npm version ${version} --no-git-tag-version\n
        // npx lerna version ${version} --no-push --no-git-tag-version --force-publish --exact --yes
        // yarn
        // `
        // 		await octokit.octokit.pulls.create({
        // 			base,
        // 			body,
        // 			head: prBranch,
        // 			owner,
        // 			repo,
        // 			title: `Release: Bump version to ${version}`,
        // 		})
    }
}
const git = async (...args) => {
    // await exec('git', args, { cwd: repo })
    await (0, exec_1.exec)('git', args);
};
new BumpVersion().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map