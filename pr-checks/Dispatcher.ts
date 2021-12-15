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
		console.debug('dispatch based on', {
			eventName: context.eventName,
			action: context.payload?.action,
		})
		const matches = this.subscribers.filter((s) => {
			return (
				s.events.includes(context.eventName) &&
				(s.actions.length === 0 ||
					(context.payload.action && s.actions.includes(context.payload?.action)))
			)
		})
		console.debug('got matches', matches)

		for (let n = 0; n < matches.length; n++) {
			const match = matches[n]
			let ctx = new CheckContext(this.api)
			try {
				console.debug('calling subcriber of event(s) and action(s)', match.events, match.actions)
				await match.callback(ctx)
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
