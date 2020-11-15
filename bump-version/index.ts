// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { getRequiredInput } from '../common/utils'
// import fs from 'fs'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'

class BumpVersion extends Action {
	id = 'BumpVersion'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const token = this.getToken()
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		if (!version) {
			throw new Error('Missing version input')
		}

		await cloneRepo({ token, owner, repo })

		process.chdir(repo)

		const base = context.ref
		const prBranch = `version-bump-${version}`

		// create branch
		await git('switch', base)
		await git('switch', '--create', prBranch)

		// Update version
		await git('npm', 'version', version)
		await git('npm', 'install')

		// make changes
		// let rawdata = fs.readFileSync('package.json')
		// let packageJson = JSON.parse(rawdata.toString())

		// packageJson.version = '2.0.0'

		// fs.writeFile('package.json', JSON.stringify(packageJson), function writeJSON(err) {
		// 	if (err) return console.log(err)
		// 	console.log('writing package.json')
		// })

		// commit
		await git('commit', '-am', '"Updated version"')

		// push
		await git('push', '--set-upstream', 'origin', prBranch)

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

new BumpVersion().run() // eslint-disable-line
