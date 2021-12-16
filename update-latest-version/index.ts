import { context } from '@actions/github'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { FileUpdater } from './FileUpdater'

class UpdateLatestVersion extends Action {
	id = 'UpdateLatestVersion'

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

		const fileUpdater = new FileUpdater()
		const latestVersionFile = './latest.json'
		const branchName = 'update-latest-version'
		const title = `Chore: updated latest.json to ${version}`

		fileUpdater.loadFile(latestVersionFile)
		fileUpdater.update({
			version: version,
		})
		fileUpdater.writeFile(latestVersionFile)

		await git('switch', '--create', branchName)
		await git('add', '-A')
		await git('commit', '-m', `${title}`)
		await git('push', '--set-upstream', 'origin', branchName)

		await octokit.octokit.pulls.create({
			base: 'main',
			body: 'Update latest.json',
			head: branchName,
			owner,
			repo,
			title,
		})
	}
}

const git = async (...args: string[]) => {
	// await exec('git', args, { cwd: repo })
	await exec('git', args)
}

new UpdateLatestVersion().run() // eslint-disable-line