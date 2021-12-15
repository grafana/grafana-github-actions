import { CheckSubscriber } from './types'

export abstract class Check {
	abstract id: string
	public abstract subscribe(s: CheckSubscriber): void
}
