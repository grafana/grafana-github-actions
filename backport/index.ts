import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { backport } from './backport'

class Backport extends Action {
	id = 'Backport'

	async onLabeled(issue: OctoKitIssue, label: string) {
		console.log('onTriggered')
		try {
			console.log('context', JSON.stringify(context, undefined, 2))
			const titleTemplate = getInput('titleTemplate')

			await backport({
				labelsToAdd: [],
				payload: context.payload as EventPayloads.WebhookPayloadPullRequest,
				titleTemplate,
				github: issue.octokit,
				token: this.getToken(),
			})
		} catch (error) {
			logError(error)
			setFailed(error.message)
		}
	}
}

new Backport().run() // eslint-disable-line
