import { Check } from '../Check'
import { BackportCheck, BackportCheckConfig } from './BackportCheck'
import { MilestoneCheck, MilestoneCheckConfig } from './MilestoneCheck'

export type CheckConfig =
	| ({ type: 'check-milestone' } & MilestoneCheckConfig)
	| ({ type: 'check-backport' } & BackportCheckConfig)

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
		}
	}

	return checks
}
