// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { Issue } from '../api/api'

class RemoveMilestone extends Action {
	id = 'RemoveMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		for (const issue of await this.getIssuesForVersion(octokit, version)) {
    }
	}

  async getIssuesForVersion(octokit: OctoKit, version: any): Promise<Issue[]> {
    const issueList = []

    for await (const page of octokit.query({ q: `is:issue is:open milestone:${version}` })) {
      for (const issue of page) {
        issueList.push(await issue.getIssue())
      }
    }

    return issueList
  }

}


new RemoveMilestone().run()
