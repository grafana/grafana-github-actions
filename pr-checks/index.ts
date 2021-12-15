import { context } from '@actions/github'
import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { ActionBase } from '../common/Action'
import { CheckConfig } from './types'
import { getChecks } from './checks'
import { Dispatcher } from './Dispatcher'

class PRChecksAction extends ActionBase {
	id = 'PR Checks'

	protected async runAction(): Promise<void> {
		const issue = context?.issue?.number

		if (!issue) {
			return
		}

		const api = new OctoKitIssue(this.getToken(), context.repo, { number: issue })
		const config = (await api.readConfig(getRequiredInput('configPath'))) as CheckConfig
		const dispatcher = new Dispatcher(api)
		const checks = getChecks()

		for (let n = 0; n < checks.length; n++) {
			const check = checks[n]

			if (check.isEnabled(config)) {
				check.subscribe(dispatcher)
			}
		}

		await dispatcher.dispatch(context, config as CheckConfig)
	}
}

new PRChecksAction().run() // eslint-disable-line
