/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKit, OctoKitIssue, getNumRequests } from '../api/octokit'
import { context, GitHub } from '@actions/github'
import { getRequiredInput, logErrorToIssue, getRateLimit, errorLoggingIssue } from './utils'
import { getInput, setFailed } from '@actions/core'
import { aiHandle } from './telemetry'
import { debug } from 'console'
import { EventPayloads } from '@octokit/webhooks'

export abstract class ActionBase {
	abstract id: string

	private token = getRequiredInput('token')

	private username: Promise<string>

	constructor() {
		this.username = new GitHub(this.getToken()).users.getAuthenticated().then(
			(v) => v.data.name,
			() => 'unknown',
		)
	}

	protected getToken() {
		return this.token
	}

	protected getVersion() {
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version
		const version_call = getInput('version_call')

		if (version) {
			return version
		}

		if (version_call) {
			return version_call
		}

		throw new Error('Missing version input')
	}

	protected isCalledFromWorkflow() {
		return Boolean(getInput('version_call'))
	}

	protected abstract runAction(): Promise<void>

	public async run() {
		console.log('running ', this.id, 'with context', {
			...context,
			payload: {
				issue: context.payload?.issue?.number,
				label: context.payload?.label?.name,
				repository: context.payload?.repository?.html_url,
				sender: context.payload?.sender?.login ?? context.payload?.sender?.type,
				action: context.payload.action,
				contextIssue: context.issue,
			},
		})

		if (errorLoggingIssue) {
			const { repo, issue, owner } = errorLoggingIssue
			if (
				context.repo.repo === repo &&
				context.repo.owner === owner &&
				context.payload.issue?.number === issue
			) {
				return console.log('refusing to run on error logging issue to prevent cascading errors')
			}
		}

		try {
			await this.runAction()
		} catch (e) {
			if (e instanceof Error) {
				await this.error(e)
			}
		}

		await this.trackMetric({ name: 'octokit_request_count', value: getNumRequests() })

		const usage = await getRateLimit(this.getToken())
		await this.trackMetric({ name: 'usage_core', value: usage.core })
		await this.trackMetric({ name: 'usage_graphql', value: usage.graphql })
		await this.trackMetric({ name: 'usage_search', value: usage.search })
	}

	protected async trackMetric(telemetry: { name: string; value: number }) {
		console.log('tracking metrics:', telemetry)
		if (aiHandle) {
			aiHandle.trackMetric(telemetry)
		}
	}

	protected async error(error: Error) {
		debug('Error when running action: ', error)
		const details: any = {
			message: `${error.message}\n${error.stack}`,
			id: this.id,
			user: await this.username,
		}

		if (context.issue.number) details.issue = context.issue.number

		const rendered = `
Message: ${details.message}

Actor: ${details.user}

ID: ${details.id}
`
		await logErrorToIssue(rendered, true, this.token)

		if (aiHandle) {
			aiHandle.trackException({ exception: error })
		}

		setFailed(error.message)
	}
}

export abstract class Action extends ActionBase {
	abstract id: string

	constructor() {
		super()
	}

	protected async runAction(): Promise<void> {
		const readonly = !!getInput('readonly')
		const issue = context?.issue?.number

		if (issue) {
			const octokit = new OctoKitIssue(this.getToken(), context.repo, { number: issue }, { readonly })
			switch (context.eventName) {
				case 'issue_comment':
					await this.onCommented(octokit, context.payload.comment.body, context.actor)
					break
				case 'issues':
				case 'pull_request':
				case 'pull_request_target':
					switch (context.payload.action) {
						case 'opened':
							await this.onOpened(octokit)
							break
						case 'reopened':
							await this.onReopened(octokit)
							break
						case 'closed':
							await this.onClosed(octokit)
							break
						case 'labeled':
							await this.onLabeled(octokit, context.payload.label.name)
							break
						case 'unassigned':
							await this.onUnassigned(octokit, context.payload.assignee.login)
							break
						case 'edited':
							await this.onEdited(octokit)
							break
						case 'milestoned':
							await this.onMilestoned(octokit)
							break
						case 'demilestoned':
							await this.onDemilestoned(octokit)
							break
						case 'synchronize':
							await this.onSynchronized(octokit)
							break
						case 'unlabeled':
							await this.onUnlabeled(octokit, context.payload.label.name)
							break
						default:
							throw Error('Unexpected action: ' + context.payload.action)
					}
			}
		} else {
			await this.onTriggered(new OctoKit(this.getToken(), context.repo, { readonly }))
		}
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onTriggered(_octokit: OctoKit): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onEdited(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onLabeled(_issue: OctoKitIssue, _label: string): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onUnlabeled(_issue: OctoKitIssue, _label: string): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onUnassigned(_issue: OctoKitIssue, _label: string): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onOpened(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onReopened(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onClosed(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onMilestoned(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onDemilestoned(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onCommented(_issue: OctoKitIssue, _comment: string, _actor: string): Promise<void> {
		throw Error('not implemented')
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	protected async onSynchronized(_issue: OctoKitIssue): Promise<void> {
		throw Error('not implemented')
	}
}
