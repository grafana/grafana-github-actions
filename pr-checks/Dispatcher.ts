import { Context } from '@actions/github/lib/context'
import { API, CheckContext, CheckSubscriber, SubscribeCallback } from './types'

export class Dispatcher implements CheckSubscriber {
	private subscribers: {
		events: string[]
		actions: string[]
		callback: SubscribeCallback
	}[] = []

	constructor(private api: API) {}

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

		this.subscribers.push({
			events,
			actions,
			callback,
		})
	}

	async dispatch(context: Context): Promise<void> {
		const callbacks = this.subscribers
			.filter((s) => {
				return (
					s.events.includes(context.eventName) &&
					(s.actions.length === 0 || s.actions.includes(context.action))
				)
			})
			.map((s) => s.callback)

		for (let n = 0; n < callbacks.length; n++) {
			const callback = callbacks[n]
			let ctx = new CheckContext(this.api?.getPullRequest)
			try {
				await callback(ctx)
				const result = ctx.getResult()
				if (!result) {
					continue
				}

				console.debug('got check result', result)

				await this.api.createStatus(
					result.sha,
					result.title,
					result.state,
					result.description,
					result.targetURL,
				)
			} catch (e) {
				console.error('failed to dispatch', e)
			}
		}
	}
}
