import { context } from '@actions/github'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { ReleaseNotesBuilder } from '../update-changelog/ReleaseNotesBuilder'

class GitHubRelease extends Action {
	id = 'GitHubRelease'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		if (!version) {
			throw new Error('Missing version input')
		}

		const builder = new ReleaseNotesBuilder(octokit, version)
		const tag = `v${version}`
		const notes = builder.buildReleaseNotes({ noHeader: true })
		const title = builder.getTitle()
		const content = `
[Download page](https://grafana.com/grafana/download/${version})
[What's new highlights](https://grafana.com/docs/grafana/latest/whatsnew/)


${notes}
`
		try {
			const existingRelease = await octokit.octokit.repos.getReleaseByTag({
				repo,
				owner,
				tag,
			})

			console.log('Updating github release')

			octokit.octokit.repos.updateRelease({
				draft: existingRelease.data.draft,
				release_id: existingRelease.data.id,
				repo,
				owner,
				name: title,
				body: content,
				tag_name: tag,
			})
		} catch (err) {
			console.log('getReleaseByTag error', err)
			console.log('Creating github release')

			octokit.octokit.repos.createRelease({
				repo,
				owner,
				name: title,
				body: content,
				tag_name: tag,
				draft: true,
			})
		}
	}
}

new GitHubRelease().run() // eslint-disable-line
