import { Check } from '../Check'
import { BackportCheck, BackportCheckConfig } from './BackportCheck'
import { ChangelogCheck, ChangelogCheckConfig } from './ChangelogCheck'
import { LabelCheck, LabelCheckConfig } from './LabelCheck'
import { MilestoneCheck, MilestoneCheckConfig } from './MilestoneCheck'

export type CheckConfig =
	| ({ type: 'check-milestone' } & MilestoneCheckConfig)
	| ({ type: 'check-backport' } & BackportCheckConfig)
	| ({ type: 'check-label' } & LabelCheckConfig)
	| ({ type: 'check-changelog' } & ChangelogCheckConfig)

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
			case 'check-label':
				checks.push(new LabelCheck(checkConfig))
				break
			case 'check-changelog':
				checks.push(new ChangelogCheck(checkConfig))
				break
		}
	}

	return checks
}
