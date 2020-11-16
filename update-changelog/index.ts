// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
// import fs from 'fs'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { FileUpdater } from './FileUpdater'
import { ReleaseNotesBuilder } from './ReleaseNotesBuilder'

class UpdateChangelog extends Action {
	id = 'UpdateChangelog'

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
		const builder = new ReleaseNotesBuilder(octokit)
		const changelogFile = './CHANGELOG.md'
		const branchName = 'update-changelog-and-relase-notes'
		const releaseNotes = await builder.buildReleaseNotes(version)
		const title = `ReleaseNotes: Updated changelog and release notes for ${version}`

		fileUpdater.loadFile(changelogFile)
		fileUpdater.update({
			version: version,
			content: releaseNotes,
		})

		fileUpdater.writeFile(changelogFile)

		await git('switch', '--create', branchName)
		await git('commit', '-am', `"${title}`)
		await git('push', '--set-upstream', 'origin', branchName)

		await octokit.octokit.pulls.create({
			base: 'master',
			body: 'This exciting, so much has changed!',
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

new UpdateChangelog().run() // eslint-disable-line
