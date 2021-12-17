import { CheckContext } from './types'

export type SubscribeCallback = (checkContext: CheckContext) => Promise<void>

export type CheckSubscriber = {
	on(events: string | string[], callback: SubscribeCallback): void
	on(events: string | string[], actions: string | string[], callback: SubscribeCallback): void
}

export interface Subscription {
	events: string[]
	actions: string[]
	callback: SubscribeCallback
}

export class Subscriber implements CheckSubscriber {
	private subcriptions: Subscription[] = []

	on(
		...args:
			| [events: string | string[], callback: SubscribeCallback]
			| [events: string | string[], actions: string | string[], callback: SubscribeCallback]
	): void {
		const eventsArg = args[0]
		let actionsArg: string | string[] = ''
		let callback: SubscribeCallback

		if (args.length > 2) {
			actionsArg = args[1] as string | string[]
			callback = args[2] as SubscribeCallback
		} else {
			callback = args[1] as SubscribeCallback
		}

		let events: string[] = []
		let actions: string[] = []

		if (typeof eventsArg === 'string') {
			events = [eventsArg]
		} else if (Array.isArray(eventsArg)) {
			events = eventsArg
		}

		if (typeof actionsArg === 'string' && actionsArg.length > 0) {
			actions = [actionsArg]
		} else if (Array.isArray(actionsArg)) {
			actions = actionsArg
		}

		this.subcriptions.push({
			events,
			actions,
			callback,
		})
	}

	subscriptions() {
		return this.subcriptions
	}

	subscriptionsByEventAction(event: string, action?: string) {
		return this.subcriptions.filter((s) => {
			return (
				s.events.includes(event) && (s.actions.length === 0 || (action && s.actions.includes(action)))
			)
		})
	}
}
