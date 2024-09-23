import { error as logError, getBooleanInput, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { backport } from './backport'

class Backport extends Action {
	id = 'Backport'

	async onClosed(issue: OctoKitIssue) {
		return this.backport(issue)
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async onLabeled(issue: OctoKitIssue, _label: string) {
		return this.backport(issue)
	}

	async backport(issue: OctoKitIssue) {
		try {
			await backport({
				issue,
				labelsToAdd: getLabelsToAdd(getInput('labelsToAdd')),
				payload: context.payload as EventPayloads.WebhookPayloadPullRequest,
				titleTemplate: getInput('title'),
				removeDefaultReviewers: getBooleanInput('removeDefaultReviewers'),
				github: issue.octokit,
				token: this.getToken(),
				sender: context.payload.sender as EventPayloads.PayloadSender,
			})
		} catch (error) {
			if (error instanceof Error) {
				logError(error)
				setFailed(error.message)
			}
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

new Backport().run() // eslint-disable-line
