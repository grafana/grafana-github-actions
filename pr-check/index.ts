import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'

class PRCheck extends Action {
	id = 'PRCheck'

	async onLabeled(issue: OctoKitIssue, label: string) {}

	async onMilestoned(issue: OctoKitIssue) {}

	async onOpened(issue: OctoKitIssue) {}
}

new PRCheck().run() // eslint-disable-line
