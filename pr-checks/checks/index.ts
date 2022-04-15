import { Check } from '../Check'
import { BackportCheck, BackportCheckConfig } from './BackportCheck'
import { MilestoneCheck, MilestoneCheckConfig } from './MilestoneCheck'
import { EnterpriseCheck, EnterpriseCheckConfig } from './EnterpriseCheck'

export type CheckConfig =
	| ({ type: 'check-milestone' } & MilestoneCheckConfig)
	| ({ type: 'check-backport' } & BackportCheckConfig)
	| ({ type: 'check-enterprise' } & EnterpriseCheckConfig)

export function getChecks(config: CheckConfig[]) {
	const checks: Check[] = []

	for (let n = 0; n < config.length; n++) {
		const checkConfig = config[n]

		switch (checkConfig.type) {
			case 'check-milestone':
				checks.push(new MilestoneCheck(checkConfig))
				break
			case 'check-backport':
				checks.push(new BackportCheck(checkConfig))
				break
			case 'check-enterprise':
				checks.push(new EnterpriseCheck(checkConfig))
				break
		}
	}

	return checks
}
