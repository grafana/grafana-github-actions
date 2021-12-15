import { context } from '@actions/github'
import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { ActionBase } from '../common/Action'
import { CheckConfig, getChecks } from './checks'
import { Dispatcher } from './Dispatcher'

class PRChecksAction extends ActionBase {
	id = 'PR Checks'

	protected async runAction(): Promise<void> {
		const issue = context?.issue?.number

		if (!issue) {
			return
		}

		const api = new OctoKitIssue(this.getToken(), context.repo, { number: issue })
		const dispatcher = new Dispatcher(api)

		const config = await api.readConfig(getRequiredInput('configPath'))
		const checks = getChecks(config as CheckConfig[])

		for (let n = 0; n < checks.length; n++) {
			const check = checks[n]
			console.debug('subscribing to check', check.id)
			check.subscribe(dispatcher)
		}

		await dispatcher.dispatch(context)
	}
}

new PRChecksAction().run() // eslint-disable-line
