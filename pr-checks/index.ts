import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { Action } from '../common/Action'
import { Checks } from './Checks'

class PRChecksAction extends Action {
	id = 'PR Checks'

	async onOpened(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onMilestoned(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onDemilestoned(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onSynchronized(issue: OctoKitIssue): Promise<void> {
		await this.onAction(issue)
	}

	async onAction(issue: OctoKitIssue): Promise<void> {
		const config = await issue.readConfig(getRequiredInput('configPath'))
		await new Checks(issue, config).run()
	}
}

new PRChecksAction().run() // eslint-disable-line
