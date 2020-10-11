import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { backport } from './backport'

class CherryPickPR extends Action {
	id = 'CherryPickPR'

	async onLabeled(issue: OctoKitIssue, _label: string) {
		try {
			const titleTemplate = '[Cherry-pick to {{base}}] {{originalTitle}}'

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

new CherryPickPR().run() // eslint-disable-line
