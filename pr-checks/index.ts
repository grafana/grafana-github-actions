import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { Action } from '../common/Action'
import { GitHubIssue } from '../api/api'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'

class PRChecksAction extends Action {
	id = 'PR Checks'

	async onOpened(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onMilestoned(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onDemilestoned(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onSynchronized(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onAction(issue: OctoKitIssue): Promise<void> {
		const config = await issue.readConfig(getRequiredInput('configPath'))
		await new Checks(issue, config).run()
	}
}

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

class Checks {
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

		if (context.eventName === 'pull_request') {
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

			console.log(
				'creating status',
				'sha',
				result.sha,
				'title',
				check.title,
				'state',
				result.state,
				'description',
				description,
				'targetUrl',
				targetURL,
			)

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

new PRChecksAction().run() // eslint-disable-line
