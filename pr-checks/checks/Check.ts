import { CheckSubscriber } from '../Subscriber'

export abstract class Check {
	abstract id: string

	public abstract subscribe(s: CheckSubscriber): void
}
