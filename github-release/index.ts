import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { isPreRelease } from '../common/utils'
import { RequestError } from '@octokit/request-error'
import { ChangelogBuilder } from '../update-changelog/ChangelogBuilder'

class GitHubRelease extends Action {
	id = 'GitHubRelease'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		if (!version) {
			throw new Error('Missing version input')
		}

		const builder = new ChangelogBuilder(octokit, version)
		const tag = `v${version}`
		const notes = await builder.buildChangelog({ noHeader: true })
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

			await octokit.octokit.repos.updateRelease({
				draft: existingRelease.data.draft,
				release_id: existingRelease.data.id,
				repo,
				owner,
				name: title,
				body: content,
				tag_name: tag,
			})
		} catch (err) {
			if (err instanceof RequestError && err.status !== 404) {
				console.log('getReleaseByTag error', err)
			}

			console.log('Creating github release')

			await octokit.octokit.repos.createRelease({
				repo,
				owner,
				name: title,
				body: content,
				tag_name: tag,
				prerelease: isPreRelease(tag),
			})
		}
	}
}

new GitHubRelease().run() // eslint-disable-line
