import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { release } from './release'

class ReleaseNotesAppender extends Action {
	id = 'ReleaseNotesAppender'

	async onClosed(issue: OctoKitIssue) {
		return this.release(issue)
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async onLabeled(issue: OctoKitIssue, _label: string) {
		return this.release(issue)
	}

	async release(issue: OctoKitIssue) {
		try {
			await release({
				labelsToAdd: getLabelsToAdd(getInput('labelsToAdd')),
				payload: context.payload as EventPayloads.WebhookPayloadPullRequest,
				titleTemplate: getInput('title'),
				releaseNotesFile: getInput('releaseNotesFile'),
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

new ReleaseNotesAppender().run() // eslint-disable-line
