import { Context } from '@actions/github/lib/context'
import { CheckSubscriber, SubscribeCallback, Subscriber } from './Subscriber'
import { API, CheckContext } from './types'

export class Dispatcher implements CheckSubscriber {
	constructor(private api: API, private subscriber: Subscriber) {}

	on(
		...args:
			| [events: string | string[], callback: SubscribeCallback]
			| [events: string | string[], actions: string | string[], callback: SubscribeCallback]
	): void {
		this.subscriber.on(...args)
	}

	async dispatch(context: Context): Promise<void> {
		console.debug('dispatch based on', {
			eventName: context.eventName,
			action: context.payload?.action,
		})
		const matches = this.subscriber.subscriptionsByEventAction(
			context?.eventName,
			context?.payload?.action,
		)
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
