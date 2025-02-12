import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Check } from '../Check'
import { CheckContext, CheckState, CheckSubscriber } from '../types'
import { LabelCheck } from './LabelCheck'

export type ChangelogCheckConfig = {
	title?: string
	targetUrl?: string
	labels: {
		exists?: string
		notExists?: string
		matches: string[]
	}
	breakingChangeLabels?: string[]
	skip?: {
		message?: string
		matches: string[]
	}
}

export const defaultChangelogLabelCheckConfig = {
	title: 'Changelog Check',
	exists: 'Changelog enabled',
	notExists: `Changelog decision needed`,
	skipped: 'Changelog skipped',
}

export const defaultConfig = {
	title: defaultChangelogLabelCheckConfig.title,
	valid: 'Validation passed',
	invalidTitle: 'PR title formatting is invalid',
	breakingChangeNoticeMissing: 'Breaking change notice is missing',
}

export class ChangelogCheck extends Check {
	id = 'changelog'
	private changelogLabelCheck: LabelCheck
	private breakingChangeLabelCheck: LabelCheck

	constructor(private config: ChangelogCheckConfig) {
		super()

		this.changelogLabelCheck = new LabelCheck({
			title: this.config.title ?? defaultChangelogLabelCheckConfig.title,
			targetUrl: this.config.targetUrl,
			labels: {
				...this.config.labels,
				exists: this.config.labels.exists ?? defaultChangelogLabelCheckConfig.exists,
				notExists: this.config.labels.notExists ?? defaultChangelogLabelCheckConfig.notExists,
			},
			skip: this.config.skip
				? {
						matches: this.config.skip.matches,
						message: this.config.skip.message ?? defaultChangelogLabelCheckConfig.skipped,
				  }
				: undefined,
		})

		this.breakingChangeLabelCheck = new LabelCheck({
			title: this.config.title ?? defaultChangelogLabelCheckConfig.title,
			labels: {
				matches: this.config.breakingChangeLabels ?? [],
			},
		})
	}

	subscribe(s: CheckSubscriber) {
		s.on(
			['pull_request', 'pull_request_target'],
			['edited', 'labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize'],
			async (ctx) => {
				const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
				if (!payload) {
					return
				}

				await this.changelogLabelCheck.runCheck(ctx)
				const changelogEnabled = ctx.getResult()
				if (
					!changelogEnabled ||
					changelogEnabled.state !== CheckState.Success ||
					changelogEnabled.description?.indexOf(
						this.config.labels.exists ?? defaultChangelogLabelCheckConfig.exists,
					) === -1
				) {
					return
				}

				if (!isTitleValid(payload.pull_request.title)) {
					return this.failure(ctx, defaultConfig.invalidTitle, payload.pull_request.head.sha)
				}

				if (this.config.breakingChangeLabels && this.config.breakingChangeLabels.length > 0) {
					ctx.reset()
					await this.breakingChangeLabelCheck.runCheck(ctx)

					const breakingChangeEnabled = ctx.getResult()
					if (
						breakingChangeEnabled &&
						breakingChangeEnabled.state === CheckState.Success &&
						!containsBreakingChangeNotice(payload.pull_request.body)
					) {
						return this.failure(
							ctx,
							defaultConfig.breakingChangeNoticeMissing,
							payload.pull_request.head.sha,
						)
					}
				}

				return this.success(ctx, payload.pull_request.head.sha)
			},
		)
	}

	private success(ctx: CheckContext, sha: string) {
		const title = this.config.title ?? defaultConfig.title
		const description = `${this.config.labels.exists ?? defaultChangelogLabelCheckConfig.exists} - ${
			defaultConfig.valid
		}`
		return ctx.success({ sha, title, description, targetURL: this.config.targetUrl })
	}

	private failure(ctx: CheckContext, reason: string, sha: string) {
		const title = this.config.title ?? defaultConfig.title
		const description = `${
			this.config.labels.exists ?? defaultChangelogLabelCheckConfig.exists
		} - ${reason}`
		return ctx.failure({ sha, title, description, targetURL: this.config.targetUrl })
	}
}

const titleRegExp = /^[\s]*(\[.+][\s])?[A-Z]{1}[a-zA-Z0-9\s/]+:[\s]{1}[A-Z]{1}.*$/

export function isTitleValid(title: string) {
	title = title.trim()
	const matches = titleRegExp.exec(title)
	return matches !== null
}

const breakingChangeNoticeRegExp = /# Release notice breaking change/m

export function containsBreakingChangeNotice(str: string) {
	const matches = breakingChangeNoticeRegExp.exec(str)
	return matches !== null
}
