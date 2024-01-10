import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Check } from '../Check'
import { CheckContext, CheckSubscriber } from '../types'

export type MilestoneCheckConfig = {
	title?: string
	targetUrl?: string
	success?: string
	failure?: string
}

export class MilestoneCheck extends Check {
	id = 'milestone'

	constructor(private config: MilestoneCheckConfig) {
		super()
	}

	subscribe(s: CheckSubscriber) {
		s.on(
			['pull_request', 'pull_request_target'],
			['opened', 'reopened', 'ready_for_review', 'synchronize'],
			async (ctx) => {
				const pr = context.payload.pull_request as EventPayloads.WebhookPayloadPullRequestPullRequest

				if (pr && pr.milestone) {
					return this.success(ctx, pr.head.sha)
				}

				return this.failure(ctx, pr.head.sha)
			},
		)

		s.on('issues', ['milestoned', 'demilestoned'], async (ctx) => {
			const issue = context.payload.issue as EventPayloads.WebhookPayloadIssuesIssue
			if (!issue || !issue.pull_request) {
				return
			}

			if (issue.state !== 'open') {
				return
			}

			const pr = await ctx.getAPI().getPullRequest()
			if (pr.milestoneId) {
				return this.success(ctx, pr.headSHA)
			}

			return this.failure(ctx, pr.headSHA)
		})
	}

	private success(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? 'Milestone Check'
		const description = this.config.success ?? 'Milestone set'
		return ctx.success({ sha, title, description, targetURL: this.config.targetUrl })
	}

	private failure(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? 'Milestone Check'
		const description = this.config.failure ?? 'Milestone not set'
		return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl })
	}
}
