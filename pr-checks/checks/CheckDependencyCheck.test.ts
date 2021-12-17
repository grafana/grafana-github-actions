import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { Check, withDependencies } from '.'
import { PullRequest, StatusesByRef } from '../../api/api'
import { Dispatcher } from '../Dispatcher'
import { CheckSubscriber, Subscriber } from '../Subscriber'
import { CheckState } from '../types'

function mockAPI(args?: { pr?: PullRequest; statusesByRef?: StatusesByRef }) {
	const getPullRequest: jest.Mock<any, any> = args?.pr ? jest.fn(() => args.pr) : jest.fn()
	const listStatusesByRef: jest.Mock<any, any> = args?.statusesByRef
		? jest.fn(() => args.statusesByRef)
		: jest.fn()

	return {
		getPullRequest,
		createStatus: jest.fn(),
		listStatusesByRef,
	}
}

describe('CheckDependencyCheck', () => {
	describe('No dependent check exists on pull request', () => {
		test.each([
			{
				eventName: 'pull_request',
				action: 'labeled',
			},
			{
				eventName: 'pull_request',
				action: 'unlabeled',
			},
			{
				eventName: 'pull_request',
				action: 'opened',
			},
			{
				eventName: 'pull_request',
				action: 'reopened',
			},
			{
				eventName: 'pull_request',
				action: 'ready_for_review',
			},
			{
				eventName: 'pull_request',
				action: 'synchronize',
			},
			{
				eventName: 'pull_request_target',
				action: 'labeled',
			},
			{
				eventName: 'pull_request_target',
				action: 'unlabeled',
			},
			{
				eventName: 'pull_request_target',
				action: 'opened',
			},
			{
				eventName: 'pull_request_target',
				action: 'reopened',
			},
			{
				eventName: 'pull_request_target',
				action: 'ready_for_review',
			},
			{
				eventName: 'pull_request_target',
				action: 'synchronize',
			},
		])('$eventName - $action - Should not create status', async ({ eventName, action }) => {
			const c = new TestCheck()
			const dc = withDependencies(c, [{ type: 'status-check', title: 'Other check' }])
			const api = mockAPI({
				pr: { headSHA: '123' } as PullRequest,
				statusesByRef: { statuses: [{ context: 'Some other check', state: CheckState.Success }] },
			})
			const d = new Dispatcher(api, new Subscriber())
			dc.subscribe(d)
			context.eventName = eventName
			context.payload = {
				action,
				issue: {
					pull_request: {},
				} as EventPayloads.WebhookPayloadIssuesIssue,
			}
			await d.dispatch(context)

			expect(api.getPullRequest.mock.calls).to.have.length(1)
			expect(api.listStatusesByRef.mock.calls).to.have.length(1)
			expect(c.calls).to.be.empty
		})

		describe('Dependent check successful', () => {
			test.each([
				{
					eventName: 'pull_request',
					action: 'labeled',
				},
				{
					eventName: 'pull_request',
					action: 'unlabeled',
				},
				{
					eventName: 'pull_request',
					action: 'opened',
				},
				{
					eventName: 'pull_request',
					action: 'reopened',
				},
				{
					eventName: 'pull_request',
					action: 'ready_for_review',
				},
				{
					eventName: 'pull_request',
					action: 'synchronize',
				},
				{
					eventName: 'pull_request_target',
					action: 'labeled',
				},
				{
					eventName: 'pull_request_target',
					action: 'unlabeled',
				},
				{
					eventName: 'pull_request_target',
					action: 'opened',
				},
				{
					eventName: 'pull_request_target',
					action: 'reopened',
				},
				{
					eventName: 'pull_request_target',
					action: 'ready_for_review',
				},
				{
					eventName: 'pull_request_target',
					action: 'synchronize',
				},
			])('$eventName - $action - Should dispatch to actual check', async ({ eventName, action }) => {
				const c = new TestCheck()
				const dc = withDependencies(c, [{ type: 'status-check', title: 'Other check' }])
				const api = mockAPI({
					pr: { headSHA: '123' } as PullRequest,
					statusesByRef: { statuses: [{ context: 'Other check', state: CheckState.Success }] },
				})
				const d = new Dispatcher(api, new Subscriber())
				dc.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action,
					issue: {
						pull_request: {},
					} as EventPayloads.WebhookPayloadIssuesIssue,
				}
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls).to.have.length(1)
				expect(api.listStatusesByRef.mock.calls).to.have.length(1)
				expect(api.listStatusesByRef.mock.calls[0][0]).to.equal('123')
				expect(Object.keys(c.calls)).to.have.lengthOf(1)
				expect(c.calls[action]).to.equal(1)
			})
		})
	})
})

class TestCheck extends Check {
	id = 'test'
	public calls: any = {}

	public subscribe(s: CheckSubscriber) {
		const eventNames = ['pull_request', 'pull_request_target']
		const actions = ['labeled', 'unlabeled', 'opened', 'reopened', 'ready_for_review', 'synchronize']

		s.on(eventNames, actions, async () => {
			console.log(context)
			if (!this.calls[context.payload.action]) {
				this.calls[context.payload.action] = 0
			}

			this.calls[context.payload.action]++
		})
	}
}
