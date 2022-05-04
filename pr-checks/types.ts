import { PullRequest } from '../api/api'

export enum CheckState {
	Error = 'error',
	Failure = 'failure',
	Pending = 'pending',
	Success = 'success',
}

export type CheckResult = {
	state: CheckState
	sha: string
	title: string
	description?: string
	targetURL?: string
}

export type SubscribeCallback = (checkContext: CheckContext) => Promise<void>

export type CheckSubscriber = {
	on(events: string | string[], callback: SubscribeCallback): void
	on(events: string | string[], actions: string | string[], callback: SubscribeCallback): void
}

export type ChecksAPI = {
	getPullRequest(): Promise<PullRequest>
}

export type API = {
	createStatus(
		sha: string,
		context: string,
		state: 'error' | 'failure' | 'pending' | 'success',
		description?: string,
		targetUrl?: string,
	): Promise<void>
} & ChecksAPI

export class CheckContext {
	private result: CheckResult | undefined

	constructor(private api: ChecksAPI) {}

	getAPI() {
		return this.api
	}

	getResult(): CheckResult | undefined {
		return this.result
	}

	pending(status: { sha: string; title: string; description?: string; targetURL?: string }) {
		this.result = {
			state: CheckState.Pending,
			...status,
		}
	}

	failure(status: { sha: string; title: string; description?: string; targetURL?: string }) {
		this.result = {
			state: CheckState.Failure,
			...status,
		}
	}

	success(status: { sha: string; title: string; description?: string; targetURL?: string }) {
		this.result = {
			state: CheckState.Success,
			...status,
		}
	}

	error(status: { sha: string; title: string; description?: string; targetURL?: string }) {
		this.result = {
			state: CheckState.Error,
			...status,
		}
	}

	reset() {
		this.result = undefined
	}
}
