import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Check } from '.'
import { CheckSubscriber, Subscriber } from '../Subscriber'
import { CheckState, State } from '../types'

export interface CheckDependencyCheckConfig {
	title: string
	missing?: {
		accept: boolean
		notAccepted: {
			state: State
			description?: string
		}
	}
	error?: {
		accept: boolean
		notAccepted: {
			state: State
			description?: string
		}
	}
	failure?: {
		accept: boolean
		notAccepted: {
			state: State
			description?: string
		}
	}
	pending?: {
		accept: boolean
		notAccepted: {
			state: State
			description?: string
		}
	}
	success?: {
		accept: boolean
		notAccepted: {
			state: State
			description?: string
		}
	}
}

export class CheckDependencyCheck extends Check {
	id = 'check-dependency-check'

	constructor(private check: Check, private config: CheckDependencyCheckConfig) {
		super()
		this.id += `/${this.config.title}`
	}

	public subscribe(s: CheckSubscriber): void {
		const depSubscriber = new Subscriber()
		this.check.subscribe(depSubscriber)
		const subscriptions = depSubscriber.subscriptions()
		for (let n = 0; n < subscriptions.length; n++) {
			const sub = subscriptions[n]
			s.on(sub.events, sub.actions, async (ctx) => {
				const issue = context.payload.issue as EventPayloads.WebhookPayloadIssuesIssue
				const pr = context.payload.pull_request as EventPayloads.WebhookPayloadPullRequestPullRequest
				if (!issue?.pull_request && !pr) {
					return
				}

				let sha = ''
				if (context.payload.pull_request) {
					sha = (context.payload as EventPayloads.WebhookPayloadPullRequest).pull_request.head.sha
				} else {
					const pr = await ctx.getAPI().getPullRequest()
					sha = pr.headSHA
				}

				const resp = await ctx.getAPI().listStatusesByRef(sha)
				for (let n = 0; n < resp.statuses.length; n++) {
					const s = resp.statuses[n]
					if (s.context === this.config.title) {
						if (s.state === CheckState.Success) {
							await sub.callback(ctx)
						}
						break
					}
				}
			})
		}
	}
}
