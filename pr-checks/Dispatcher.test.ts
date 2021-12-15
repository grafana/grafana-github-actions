import { expect } from 'chai'
import { Dispatcher } from './Dispatcher'
import { Check } from './Check'
import { CheckState, CheckSubscriber } from './types'
import { context } from '@actions/github'

describe('Dispatcher', () => {
	describe('isMatch and dispatch', () => {
		describe('When check subscribes and webhook event unhandled is triggered', () => {
			it('Should not dispatch to check', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'unhandled'
				expect(await d.isMatch(context)).to.be.false
				await d.dispatch(context, null)

				expect(check.calls).equal(0)
			})
		})

		describe('When check subscribes and webhook event e1 is triggered', () => {
			it('Should dispatch to check 2 times', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.action = 'a100'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(2)
			})
		})

		describe('When check subscribes and webhook event e1 with action a1 is triggered', () => {
			it('Should dispatch to check 6 times', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.action = 'a1'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(6)
			})
		})

		describe('When check subscribes and webhook event e1 with action a2 is triggered', () => {
			it('Should dispatch to check 4 times', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e1'
				context.action = 'a2'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(4)
			})
		})

		describe('When check subscribes and webhook event e2 is triggered', () => {
			it('Should dispatch to check 1 time', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.action = 'a100'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(1)
			})
		})

		describe('When check subscribes and webhook event e2 with action a1 is triggered', () => {
			it('Should dispatch to check 3 times', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.action = 'a1'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(3)
			})
		})

		describe('When check subscribes and webhook event e2 with action a2 is triggered', () => {
			it('Should dispatch to check 2 times', async () => {
				const d = new Dispatcher(null)
				const check = new TestCheck()
				check.subscribe(d)
				context.eventName = 'e2'
				context.action = 'a2'
				expect(await d.isMatch(context)).to.be.true
				await d.dispatch(context, null)

				expect(check.calls).equal(2)
			})
		})
	})

	describe('dispatch should create status', () => {
		describe('When check subscribes and webhook event success is triggered', () => {
			it('Should dispatch and create success status', async () => {
				const mockCallback = jest.fn()
				const d = new Dispatcher({
					createStatus: mockCallback,
					getPullRequest: jest.fn(),
				})
				const check = new TestUpdateCheck()
				check.subscribe(d)
				context.eventName = 'success'
				await d.dispatch(context, { sha: 'sha', title: 'Test', description: 'Success' })

				expect(mockCallback.mock.calls.length).to.equal(1)
				expect(mockCallback.mock.calls[0][0]).to.equal('sha')
				expect(mockCallback.mock.calls[0][1]).to.equal('Test')
				expect(mockCallback.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(mockCallback.mock.calls[0][3]).to.equal('Success')
				expect(mockCallback.mock.calls[0][4]).to.equal(undefined)
			})
		})

		describe('When check subscribes and webhook event failure is triggered', () => {
			it('Should dispatch and create failure status', async () => {
				const mockCallback = jest.fn()
				const d = new Dispatcher({
					createStatus: mockCallback,
					getPullRequest: jest.fn(),
				})
				const check = new TestUpdateCheck()
				check.subscribe(d)
				context.eventName = 'failure'
				await d.dispatch(context, { sha: 'sha', title: 'Test', description: 'Failure' })

				expect(mockCallback.mock.calls.length).to.equal(1)
				expect(mockCallback.mock.calls[0][0]).to.equal('sha')
				expect(mockCallback.mock.calls[0][1]).to.equal('Test')
				expect(mockCallback.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(mockCallback.mock.calls[0][3]).to.equal('Failure')
				expect(mockCallback.mock.calls[0][4]).to.equal(undefined)
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
	public subscribe(s: CheckSubscriber) {
		s.on('success', async (ctx) => {
			const config = ctx.getConfig() as any
			ctx.success({ sha: config.sha, title: config.title, description: config.description })
		})

		s.on('failure', async (ctx) => {
			const config = ctx.getConfig() as any
			ctx.failure({ sha: config.sha, title: config.title, description: config.description })
		})
	}
}
