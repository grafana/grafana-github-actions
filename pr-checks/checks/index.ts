import { Check } from '../Check'
import { MilestoneCheck, MilestoneCheckConfig } from './MilestoneCheck'

export type CheckConfig = {
	type: string
}

export function getChecks(config: CheckConfig[]) {
	const checks: Check[] = []

	for (let n = 0; n < config.length; n++) {
		const checkConfig = config[n]

		switch (checkConfig.type) {
			case 'check-milestone':
				checks.push(new MilestoneCheck(checkConfig as MilestoneCheckConfig))
		}
	}

	return checks
}
