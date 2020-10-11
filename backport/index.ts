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
			await backport({
				labelsToAdd: getLabelsToAdd(getInput('labelsToAdd')),
				payload: context.payload as EventPayloads.WebhookPayloadPullRequest,
				titleTemplate: getInput('title'),
				github: issue.octokit,
				token: this.getToken(),
			})
		} catch (error) {
			logError(error)
			setFailed(error.message)
		}
	}
}

export const getLabelsToAdd = (input: string | undefined): string[] => {
	if (input === undefined || input === '') {
		return []
	}

	const labels = input.split(',')
	return labels.map((v) => v.trim()).filter((v) => v !== '')
}

new CherryPickPR().run() // eslint-disable-line
