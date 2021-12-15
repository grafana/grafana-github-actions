import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { PullRequest } from '../../api/api'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { MilestoneCheck } from './MilestoneCheck'

describe('MilestoneCheck', () => {
	describe('pull_request|opened|Without milestone set', () => {
		it('Should create status failure', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({ title: 'Test', failure: 'Failed', targetUrl: 'http://' })
			c.subscribe(d)
			context.eventName = 'pull_request'
			context.payload = {
				action: 'opened',
			}
			context.payload.pull_request = {
				head: {
					sha: '123',
				},
			} as EventPayloads.WebhookPayloadPullRequestPullRequest
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls[0][0]).to.equal('123')
			expect(createStatusMock.mock.calls[0][1]).to.equal('Test')
			expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
			expect(createStatusMock.mock.calls[0][3]).to.equal('Failed')
			expect(createStatusMock.mock.calls[0][4]).to.equal('http://')
		})

		describe('pull_request|opened|With milestone set', () => {
			it('Should create status success', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new MilestoneCheck({
					title: 'Test',
					success: 'Milestone set',
					targetUrl: 'http://',
				})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'opened',
				}
				context.payload.pull_request = {
					head: {
						sha: '123',
					},
					milestone: {},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal('Test')
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal('Milestone set')
				expect(createStatusMock.mock.calls[0][4]).to.equal('http://')
			})
		})
	})

	describe('pull_request_target|synchronize|Without milestone set', () => {
		it('Should create status failure', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({ title: 'Test', failure: 'Failed', targetUrl: 'http://' })
			c.subscribe(d)
			context.eventName = 'pull_request_target'
			context.payload = {
				action: 'synchronize',
			}
			context.payload.pull_request = {
				head: {
					sha: '123',
				},
			} as EventPayloads.WebhookPayloadPullRequestPullRequest
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls[0][0]).to.equal('123')
			expect(createStatusMock.mock.calls[0][1]).to.equal('Test')
			expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
			expect(createStatusMock.mock.calls[0][3]).to.equal('Failed')
			expect(createStatusMock.mock.calls[0][4]).to.equal('http://')
		})

		describe('pull_request_target|synchronize|With milestone set', () => {
			it('Should create status success', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new MilestoneCheck({
					title: 'Test',
					success: 'Milestone set',
					targetUrl: 'http://',
				})
				c.subscribe(d)
				context.eventName = 'pull_request_target'
				context.payload = {
					action: 'synchronize',
				}
				context.payload.pull_request = {
					head: {
						sha: '123',
					},
					milestone: {},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal('Test')
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal('Milestone set')
				expect(createStatusMock.mock.calls[0][4]).to.equal('http://')
			})
		})
	})

	describe('issues|milestoned|For non-pull request', () => {
		it('Should not create status', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'milestoned',
			}
			context.payload.issue = {
				state: 'open',
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(0)
		})
	})

	describe('issues|milestoned|For pull request', () => {
		it('Should create status success', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn(
				async () => ({ milestoneId: 1, headSHA: '123' } as PullRequest),
			)
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'milestoned',
			}
			context.payload.issue = {
				state: 'open',
				pull_request: {},
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls[0][0]).to.equal('123')
			expect(createStatusMock.mock.calls[0][1]).to.equal('Milestone Check')
			expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
			expect(createStatusMock.mock.calls[0][3]).to.equal('Milestone set')
			expect(createStatusMock.mock.calls[0][4]).to.equal(undefined)
		})
	})

	describe('issues|milestoned|For pull request, issue closed', () => {
		it('Should not create status', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'milestoned',
			}
			context.payload.issue = {
				state: 'closed',
				pull_request: {},
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(0)
		})
	})

	describe('issues|demilestoned|For non-pull request', () => {
		it('Should not create status', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'demilestoned',
			}
			context.payload.issue = {
				state: 'open',
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(0)
		})
	})

	describe('issues|demilestoned|For pull request', () => {
		it('Should create status failure', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn(
				async () => ({ milestoneId: null, headSHA: '123' } as PullRequest),
			)
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'demilestoned',
			}
			context.payload.issue = {
				state: 'open',
				pull_request: {},
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls.length).to.equal(1)
			expect(createStatusMock.mock.calls[0][0]).to.equal('123')
			expect(createStatusMock.mock.calls[0][1]).to.equal('Milestone Check')
			expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
			expect(createStatusMock.mock.calls[0][3]).to.equal('Milestone not set')
			expect(createStatusMock.mock.calls[0][4]).to.equal(undefined)
		})
	})

	describe('issues|demilestoned|For pull request, issue closed', () => {
		it('Should not create status', async () => {
			const createStatusMock = jest.fn()
			const getPullRequestMock = jest.fn()
			const d = new Dispatcher({
				createStatus: createStatusMock,
				getPullRequest: getPullRequestMock,
			})
			const c = new MilestoneCheck({})
			c.subscribe(d)
			context.eventName = 'issues'
			context.payload = {
				action: 'demilestoned',
			}
			context.payload.issue = {
				state: 'closed',
				pull_request: {},
			} as EventPayloads.WebhookPayloadIssuesIssue
			await d.dispatch(context)

			expect(getPullRequestMock.mock.calls.length).to.equal(0)
			expect(createStatusMock.mock.calls.length).to.equal(0)
		})
	})
})
