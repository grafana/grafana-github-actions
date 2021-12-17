import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'
import { Issue } from '../api/api'

class CloseMilestone extends Action {
	id = 'CloseMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version

		if (!version) {
			throw new Error('Missing version input')
		}

		// get the milestone number
		const milestones = await octokit.octokit.issues.listMilestonesForRepo({
			owner,
			repo,
      state: 'open',
		})

    for (const milestone of milestones) {
      if(milestone.title === version) {
        await octokit.octokit.issues.updateMilestone({
          owner,
          repo,
          milestone_number: milestone.number,
          state: 'closed',
          description: `${milestone.description}\n Closed by github action`,
        });
        return;
      }
    }
	}
}

new CloseMilestone().run() // eslint-disable-line
