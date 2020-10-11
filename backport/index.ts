import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { backport } from './backport'

class Backporter extends Action {
	id = 'Backporter'

	async onClosed(_issue: OctoKitIssue) {
		console.log('context.payload', context.payload)
	}

	async onLabeled(issue: OctoKitIssue) {
		try {
			console.log('context', JSON.stringify(context, undefined, 2))
			const titleTemplate = getInput('titleTemplate')

			await backport({
				labelsToAdd: [],
				payload: context.payload as EventPayloads.WebhookPayloadPullRequest,
				titleTemplate,
				issue,
				token: this.getToken(),
			})
		} catch (error) {
			logError(error)
			setFailed(error.message)
		}
	}
}

new Backporter().run() // eslint-disable-line
