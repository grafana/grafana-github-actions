import { BackportCheck, BackportCheckConfig } from './BackportCheck'
import { Check } from './Check'
import { CheckDependencyCheck, CheckDependencyCheckConfig } from './CheckDependencyCheck'
import { MilestoneCheck, MilestoneCheckConfig } from './MilestoneCheck'

export { Check }

export type DependencyConfig = { type: 'status-check' } & CheckDependencyCheckConfig

export type CheckConfig = (
	| ({ type: 'check-milestone' } & MilestoneCheckConfig)
	| ({ type: 'check-backport' } & BackportCheckConfig)
) & { dependencies?: DependencyConfig[] }

export function getChecks(config: CheckConfig[]) {
	const checks: Check[] = []

	for (let n = 0; n < config.length; n++) {
		const checkConfig = config[n]

		switch (checkConfig.type) {
			case 'check-milestone':
				checks.push(withDependencies(new MilestoneCheck(checkConfig), checkConfig.dependencies))
				break
			case 'check-backport':
				checks.push(withDependencies(new BackportCheck(checkConfig), checkConfig.dependencies))
				break
		}
	}

	return checks
}

export function withDependencies(check: Check, deps?: DependencyConfig[]) {
	if (!deps || deps.length === 0) {
		return check
	}

	const dep = deps[0]

	if (dep.type === 'status-check') {
		return new CheckDependencyCheck(check, dep)
	}

	return check
}
