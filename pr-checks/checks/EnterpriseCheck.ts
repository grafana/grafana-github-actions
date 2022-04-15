import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Check } from '../Check'
import { CheckContext, CheckSubscriber } from '../types'

export type EnterpriseCheckConfig = {
	title?: string
	success?: string
	enterpriseFailure?: string
	noLabelFailure?: string
	tooManyLabelsFailure?: string
	override?: string
}

export const defaultConfig = {
	title: 'Enterprise Check',
	success: 'Enterprise build passed',
	enterpriseFailure: 'Enterprise build failed',
	noLabelFailure: 'Waiting for Enterprise build to complete',
	tooManyLabelsFailure: 'Too many enterprise-XX labels, only one should be set',
	override: 'Any failure in Enterprise build was ignored',
}

const EnterpriseOKLabel = 'enterprise-ok'
const EnterpriseOverrideLabel = 'enterprise-override'
const EnterpriseKOLabel = 'enterprise-ko'

const labelRegExp = /^enterprise-(ok|ko|override)$/

export class EnterpriseCheck extends Check {
	id = 'enterprise'

	constructor(private config: EnterpriseCheckConfig) {
		super()
	}

	subscribe(s: CheckSubscriber) {
		s.on(
			['pull_request', 'pull_request_target'],
			['labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'],
			async (ctx) => {
				const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
				if (!payload) {
					return
				}

				if (payload.pull_request.state !== 'open') {
					return
				}

				let enterpriseLabel = ''
				const sha = payload.pull_request.head.sha
				for (let n = 0; n < payload.pull_request.labels.length; n++) {
					const existingLabel = payload.pull_request.labels[n]
					const matches = labelRegExp.exec(existingLabel.name)
					if (matches !== null) {
						if (enterpriseLabel === '') {
							enterpriseLabel = matches[0]
						} else {
							return this.response(
								ctx,
								sha,
								this.config.tooManyLabelsFailure ?? defaultConfig.tooManyLabelsFailure,
								false,
							)
						}
					}
				}

				switch (enterpriseLabel) {
					case EnterpriseOKLabel:
						return this.response(ctx, sha, this.config.success ?? defaultConfig.success, true)
					case EnterpriseOverrideLabel:
						return this.response(ctx, sha, this.config.override ?? defaultConfig.override, true)
					case EnterpriseKOLabel:
						return this.response(
							ctx,
							sha,
							this.config.enterpriseFailure ?? defaultConfig.enterpriseFailure,
							false,
						)
				}

				return this.response(
					ctx,
					sha,
					this.config.noLabelFailure ?? defaultConfig.noLabelFailure,
					false,
				)
			},
		)
	}

	private response(ctx: CheckContext, sha: string, description: string, isSuccess: boolean) {
		const title = this.config.title ?? defaultConfig.title
		if (isSuccess) {
			return ctx.success({ sha, title, description })
		}

		return ctx.failure({ sha, title, description })
	}
}
