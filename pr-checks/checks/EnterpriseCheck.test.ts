import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { EnterpriseCheck, defaultConfig } from './EnterpriseCheck'

describe('EnterpriseCheck', () => {
	describe('pull_request|labeled', () => {
		describe('Pull request closed', () => {
			it('Should not create status', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'closed',
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(0)
			})
		})

		describe('Not matching enterprise label', () => {
			it('Should create status failure (no label)', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [
						{ name: 'add to changelog' },
						{ name: 'enterprise' },
						{ name: 'grafana-enterprise-partners' },
					],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.noLabelFailure)
			})
		})

		describe('Matching enterprise-ok label', () => {
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
			])(
				'$eventName - $action - Should create status success with success message',
				async ({ eventName, action }) => {
					const createStatusMock = jest.fn()
					const getPullRequestMock = jest.fn()
					const d = new Dispatcher({
						createStatus: createStatusMock,
						getPullRequest: getPullRequestMock,
					})
					const c = new EnterpriseCheck({})
					c.subscribe(d)
					context.eventName = eventName
					context.payload = {
						action,
					}
					context.payload.pull_request = {
						state: 'open',
						labels: [
							{ name: 'add to changelog' },
							{ name: 'enterprise-ok' },
						],
						head: {
							sha: '123',
						},
					} as EventPayloads.WebhookPayloadPullRequestPullRequest
					await d.dispatch(context)

					expect(getPullRequestMock.mock.calls.length).to.equal(0)
					expect(createStatusMock.mock.calls.length).to.equal(1)
					expect(createStatusMock.mock.calls[0][0]).to.equal('123')
					expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
					expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
					expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.success)
				},
			)
		})

		describe('Matching enterprise-override label', () => {
			it('Should create status success with override message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'enterprise-override' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.override)
			})
		})

		describe('Matching enterprise-ko label', () => {
			it('Should create status failure with enterprise failure message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'enterprise-ko' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.enterpriseFailure)
			})
		})

		describe('Matching too many enterprise labels', () => {
			it('Should create status failure with too many labels message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'enterprise-ko' }, { name: 'enterprise-override' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.tooManyLabelsFailure)
			})
		})
	})

	describe('pull_request|unlabeled', () => {
		describe('Pull request closed', () => {
			it('Should not create status', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new EnterpriseCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
				}
				context.payload.pull_request = {
					state: 'closed',
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(0)
			})
		})
	})
})
