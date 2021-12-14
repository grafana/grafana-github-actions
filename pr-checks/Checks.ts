import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { GitHubIssue } from '../api/api'

export type CheckConfig = {
	type: string
	title: string
	targetUrl?: string
	success: string
	failure: string
}

export enum CheckState {
	Error = 'error',
	Failure = 'failure',
	Pending = 'pending',
	Success = 'success',
}

export type CheckResult = {
	state: CheckState
	sha: string
	description?: string
	targetURL?: string
}

export class Checks {
	constructor(private github: GitHubIssue, private config: CheckConfig[]) {}

	async run() {
		const checkMilestone = this.config.find((c) => c.type === 'check-milestone')
		if (checkMilestone) {
			console.log('running check-milestone check')
			await this.checkMilestone(checkMilestone)
		}
	}

	private async checkMilestone(check: CheckConfig) {
		let result: CheckResult | undefined

		if (context.eventName === 'pull_request' || context.eventName === 'pull_request_target') {
			result = await this.handlePullRequestEvent()
		}

		if (context.eventName === 'issues') {
			result = await this.handleIssueEvent()
		}

		if (result) {
			console.log('got check result', result)
			let description = result.description ?? ''
			let targetURL = check.targetUrl ?? result.targetURL

			if (result.state === CheckState.Failure) {
				description = check.failure ?? description
			}

			if (result.state === CheckState.Success) {
				description = check.success ?? description
			}

			await this.github.createStatus(result.sha, check.title, result.state, description, targetURL)
		}
	}

	private async handlePullRequestEvent() {
		const pr = context.payload.pull_request as EventPayloads.WebhookPayloadPullRequestPullRequest

		if (pr && pr.milestone) {
			return this.success(pr.head.sha)
		}

		return this.failure(pr.head.sha)
	}

	private async handleIssueEvent() {
		const issue = context.payload.issue as EventPayloads.WebhookPayloadIssuesIssue
		if (!issue.pull_request) {
			return this.skip()
		}

		const pr = await this.github.getPullRequest()
		if (pr.milestoneId) {
			return this.success(pr.headSHA)
		}

		return this.failure(pr.headSHA)
	}

	private failure(sha: string): CheckResult {
		return {
			description: 'Milestone not set',
			state: CheckState.Failure,
			sha: sha,
		}
	}

	private success(sha: string): CheckResult {
		return {
			description: 'Milestone set',
			state: CheckState.Success,
			sha,
		}
	}

	private skip() {
		return undefined
	}
}
