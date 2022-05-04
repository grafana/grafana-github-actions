import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Check } from '../Check'
import { CheckContext, CheckSubscriber } from '../types'

export type LabelCheckConfig = {
	title?: string
	targetUrl?: string
	labels: {
		exists?: string
		notExists?: string
		matches: string[]
	}
	skip?: {
		message?: string
		matches: string[]
	}
}

export const defaultConfig = {
	title: 'Label Check',
	exists: 'Check success',
	notExists: `Check failure`,
	skipped: 'Check skipped',
}

export class LabelCheck extends Check {
	id = 'label'

	constructor(private config: LabelCheckConfig) {
		super()
	}

	subscribe(s: CheckSubscriber) {
		s.on(
			['pull_request', 'pull_request_target'],
			['labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'],
			async (ctx) => {
				await this.runCheck(ctx)
			},
		)
	}

	async runCheck(ctx: CheckContext) {
		const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
		if (!payload) {
			return
		}

		if (payload.pull_request.state !== 'open') {
			return
		}

		for (let n = 0; n < payload.pull_request.labels.length; n++) {
			const existingLabel = payload.pull_request.labels[n]

			for (let i = 0; i < this.config.labels.matches.length; i++) {
				if (stringMatchesLabel(this.config.labels.matches[i], existingLabel.name)) {
					return this.successEnabled(ctx, payload.pull_request.head.sha)
				}
			}
		}

		if (this.config.skip) {
			for (let n = 0; n < payload.pull_request.labels.length; n++) {
				const existingLabel = payload.pull_request.labels[n]

				for (let i = 0; i < this.config.skip.matches.length; i++) {
					if (stringMatchesLabel(this.config.skip.matches[i], existingLabel.name)) {
						return this.successSkip(ctx, payload.pull_request.head.sha)
					}
				}
			}
		}

		return this.failure(ctx, payload.pull_request.head.sha)
	}

	private successEnabled(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? defaultConfig.title
		const description = this.config.labels.exists ?? defaultConfig.exists
		return ctx.success({ sha, title, description, targetURL: this.config.targetUrl })
	}

	private successSkip(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? defaultConfig.title
		const description = this.config.skip?.message ?? defaultConfig.skipped
		return ctx.success({ sha, title, description, targetURL: this.config.targetUrl })
	}

	private failure(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? defaultConfig.title
		const description = this.config.labels.notExists ?? defaultConfig.notExists
		return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl })
	}
}

export function stringMatchesLabel(str: string, label: string) {
	str = str.trim()

	if (str === '') {
		return false
	}

	if (str === '*') {
		return true
	}

	const lastAnyCharIndex = str.lastIndexOf('*')

	return (lastAnyCharIndex !== -1 && label.startsWith(str.substring(0, lastAnyCharIndex))) || str === label
}
