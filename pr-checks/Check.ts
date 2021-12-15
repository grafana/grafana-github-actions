import { CheckConfig, CheckSubscriber } from './types'

export abstract class Check {
	abstract id: string
	public abstract subscribe(s: CheckSubscriber): void

	isEnabled(config: CheckConfig) {
		if (config[this.id]) {
			return true
		}

		return false
	}
}
