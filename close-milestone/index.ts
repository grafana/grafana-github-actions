import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'

class CloseMilestone extends Action {
	id = 'CloseMilestone'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const version = this.getVersion()

		// get all the milestones
		const milestones = await octokit.octokit.issues.listMilestonesForRepo({
			owner,
			repo,
			state: 'open',
		})

		for (const milestone of milestones.data) {
			if (milestone.title === version) {
				await octokit.octokit.issues.updateMilestone({
					owner,
					repo,
					milestone_number: milestone.number,
					state: 'closed',
					description: `${milestone.description}\n Closed by github action`,
				})
				return
			}
		}

		throw new Error('Could not find milestone')
	}
}

new CloseMilestone().run() // eslint-disable-line
