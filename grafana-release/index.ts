// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
// import fs from 'fs'
import { OctoKit } from '../api/octokit'

class GrafanaRelease extends Action {
	id = 'GrafanaRelease'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const token = this.getToken()
		console.log('context', JSON.stringify(context, null, 2))

		await cloneRepo({ token, owner, repo })

		process.chdir(repo)

		const base = 'main'
		const prBranch = 'patch'

		// create branch
		await git('switch', base)
		await git('switch', '--create', prBranch)

		// make changes
		// let rawdata = fs.readFileSync('package.json')
		// let packageJson = JSON.parse(rawdata.toString())

		// packageJson.version = '2.0.0'

		// fs.writeFile('package.json', JSON.stringify(packageJson), function writeJSON(err) {
		// 	if (err) return console.log(err)
		// 	console.log('writing package.json')
		// })

		await git('npx', 'add', 'lodash')

		// commit
		await git('commit', '-am', '"Updated version"')

		// push
		await git('push', '--set-upstream', 'origin', prBranch)

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

const git = async (...args: string[]) => {
	// await exec('git', args, { cwd: repo })
	await exec('git', args)
}

new GrafanaRelease().run() // eslint-disable-line
