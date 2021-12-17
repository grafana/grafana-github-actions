import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { Issue } from '../api/api'

class CloseMilestone extends Action {
	id = 'CloseMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		if (!version) {
			throw new Error('Missing version input')
		}

		// get the milestone number
		const milestone = await octokit.octokit.issues.listMilestonesForRepo({
			owner,
			repo,
		})
		// update the milestone to closed

		// for (const issue of await getIssuesForVersion(octokit, version)) {
		// 	await octokit.octokit.issues.update({
		// 		owner,
		// 		repo,
		// 		issue_number: issue.number,
		// 		milestone: null,
		// 	})

		// 	await octokit.octokit.issues.createComment({
		// 		body: `This issue was removed from the ${version} milestone because ${version} is currently being released.`,
		// 		issue_number: issue.number,
		// 		owner,
		// 		repo,
		// 	})
		// }

		// for (const issue of await getPullRequestsForVersion(octokit, version)) {
		// 	await octokit.octokit.issues.update({
		// 		owner,
		// 		repo,
		// 		issue_number: issue.number,
		// 		milestone: null,
		// 	})

		// 	await octokit.octokit.issues.createComment({
		// 		body: `This pull request was removed from the ${version} milestone because ${version} is currently being released.`,
		// 		issue_number: issue.number,
		// 		owner,
		// 		repo,
		// 	})
		// }
	}
}

new CloseMilestone().run() // eslint-disable-line
