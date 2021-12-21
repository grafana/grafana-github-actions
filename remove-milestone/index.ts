import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { Issue } from '../api/api'

class RemoveMilestone extends Action {
	id = 'RemoveMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const version = this.getVersion()

		for (const issue of await getIssuesForVersion(octokit, version)) {
			await octokit.octokit.issues.update({
				owner,
				repo,
				issue_number: issue.number,
				milestone: null,
			})

			await octokit.octokit.issues.createComment({
				body: `This issue was removed from the ${version} milestone because ${version} is currently being released.`,
				issue_number: issue.number,
				owner,
				repo,
			})
		}

		for (const issue of await getPullRequestsForVersion(octokit, version)) {
			await octokit.octokit.issues.update({
				owner,
				repo,
				issue_number: issue.number,
				milestone: null,
			})

			await octokit.octokit.issues.createComment({
				body: `This pull request was removed from the ${version} milestone because ${version} is currently being released.`,
				issue_number: issue.number,
				owner,
				repo,
			})
		}
	}
}

async function getIssuesForVersion(octokit: OctoKit, version: any): Promise<Issue[]> {
	const issueList = []

	for await (const page of octokit.query({ q: `is:issue is:open milestone:${version}` })) {
		for (const issue of page) {
			issueList.push(await issue.getIssue())
		}
	}

	return issueList
}

async function getPullRequestsForVersion(octokit: OctoKit, version: any): Promise<Issue[]> {
	const issueList = []

	for await (const page of octokit.query({ q: `is:pr is:open milestone:${version} base:main` })) {
		for (const issue of page) {
			issueList.push(await issue.getIssue())
		}
	}

	return issueList
}

new RemoveMilestone().run() // eslint-disable-line
