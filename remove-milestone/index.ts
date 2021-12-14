// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'

class RemoveMilestone extends Action {
	id = 'RemoveMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo

		octokit.octokit.issues.deleteMilestone()
	}
}


new RemoveMilestone().run()
