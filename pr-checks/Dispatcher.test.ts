import { expect } from 'chai'
import { Dispatcher } from './Dispatcher'
import { CheckState } from './types'
import { context } from '@actions/github'
import { Check } from './checks'
import { CheckSubscriber, Subscriber } from './Subscriber'

function mockAPI() {
	return {
		getPullRequest: jest.fn(),
		createStatus: jest.fn(),
		listStatusesByRef: jest.fn(),
	}
}

describe('Dispatcher', () => {
	describe('isMatch and dispatch', () => {
		describe('When check subscribes and webhook event unhandled is triggered', () => {
			it('Should not dispatch to check', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'unhandled'
				await d.dispatch(context)

				expect(check.calls).equal(0)
			})
		})

		describe('When check subscribes and webhook event e1 is triggered', () => {
			it('Should dispatch to check 2 times', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.payload = {
					action: 'a100',
				}
				await d.dispatch(context)

				expect(check.calls).equal(2)
			})
		})

		describe('When check subscribes and webhook event e1 with action a1 is triggered', () => {
			it('Should dispatch to check 6 times', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.payload = {
					action: 'a1',
				}
				await d.dispatch(context)

				expect(check.calls).equal(6)
			})
		})

		describe('When check subscribes and webhook event e1 with action a2 is triggered', () => {
			it('Should dispatch to check 4 times', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.payload = {
					action: 'a2',
				}
				await d.dispatch(context)

				expect(check.calls).equal(4)
			})
		})

		describe('When check subscribes and webhook event e2 is triggered', () => {
			it('Should dispatch to check 1 time', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.payload = {
					action: 'a100',
				}
				await d.dispatch(context)

				expect(check.calls).equal(1)
			})
		})

		describe('When check subscribes and webhook event e2 with action a1 is triggered', () => {
			it('Should dispatch to check 3 times', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.payload = {
					action: 'a1',
				}
				await d.dispatch(context)

				expect(check.calls).equal(3)
			})
		})

		describe('When check subscribes and webhook event e2 with action a2 is triggered', () => {
			it('Should dispatch to check 2 times', async () => {
				const d = new Dispatcher(null, new Subscriber())
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.payload = {
					action: 'a2',
				}
				await d.dispatch(context)

				expect(check.calls).equal(2)
			})
		})
	})

	describe('dispatch should create status', () => {
		describe('When check subscribes and webhook event success is triggered', () => {
			it('Should dispatch and create success status', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const check = new TestUpdateCheck({ sha: 'sha', title: 'Test', description: 'Success' })
				check.subscribe(d)
				context.eventName = 'success'
				await d.dispatch(context)

				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('sha')
				expect(api.createStatus.mock.calls[0][1]).to.equal('Test')
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal('Success')
				expect(api.createStatus.mock.calls[0][4]).to.equal(undefined)
			})
		})

		describe('When check subscribes and webhook event failure is triggered', () => {
			it('Should dispatch and create failure status', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const check = new TestUpdateCheck({ sha: 'sha', title: 'Test', description: 'Failure' })
				check.subscribe(d)
				context.eventName = 'failure'
				await d.dispatch(context)

				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('sha')
				expect(api.createStatus.mock.calls[0][1]).to.equal('Test')
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(api.createStatus.mock.calls[0][3]).to.equal('Failure')
				expect(api.createStatus.mock.calls[0][4]).to.equal(undefined)
			})
		})
	})
})

class TestCheck extends Check {
	id = 'test'
	public calls = 0

	public subscribe(s: CheckSubscriber) {
		s.on('e1', async () => {
			this.calls++
		})

		s.on(['e1', 'e2'], async () => {
			this.calls++
		})

		s.on('e1', 'a1', async () => {
			this.calls++
		})

		s.on('e1', ['a1', 'a2'], async () => {
			this.calls++
		})

		s.on(['e1', 'e2'], 'a1', async () => {
			this.calls++
		})

		s.on(['e1', 'e2'], ['a1', 'a2'], async () => {
			this.calls++
		})
	}
}

class TestUpdateCheck extends Check {
	id = 'testUpdate'

	constructor(private config: { sha: string; title: string; description: string }) {
		super()
	}

	public subscribe(s: CheckSubscriber) {
		s.on('success', async (ctx) => {
			ctx.success(this.config)
		})

		s.on('failure', async (ctx) => {
			ctx.failure(this.config)
		})
	}
}
