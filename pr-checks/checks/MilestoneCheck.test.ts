import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { PullRequest } from '../../api/api'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { MilestoneCheck } from './MilestoneCheck'

describe('MilestoneCheck', () => {
	describe('Pull Requests', () => {
		test.each([
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request',
				action: 'opened',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request',
				action: 'reopened',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request',
				action: 'synchronize',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request',
				action: 'ready_for_review',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request_target',
				action: 'opened',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request_target',
				action: 'reopened',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request_target',
				action: 'ready_for_review',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'without milestone set',
				eventName: 'pull_request_target',
				action: 'synchronize',
				checkState: CheckState.Failure,
				description: 'Failed',
				pull_request_payload: {},
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request',
				action: 'opened',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request',
				action: 'reopened',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request',
				action: 'ready_for_review',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request',
				action: 'synchronize',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request_target',
				action: 'opened',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request_target',
				action: 'reopened',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request_target',
				action: 'ready_for_review',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
			{
				testCaseName: 'with milestone set',
				eventName: 'pull_request_target',
				action: 'synchronize',
				checkState: CheckState.Success,
				description: 'Milestone set',
				pull_request_payload: { milestone: {} },
			},
		])(
			'$eventName - $action - $testCaseName - Should create status $checkState',
			async ({ eventName, action, checkState, description, pull_request_payload }) => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
				const c = new MilestoneCheck({
					title: 'Test',
					failure: 'Failed',
					success: 'Milestone set',
					targetUrl: 'http://',
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action,
				}
				context.payload.pull_request = {
					head: {
						sha: '123',
					},
					...pull_request_payload,
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal('Test')
				expect(createStatusMock.mock.calls[0][2]).to.equal(checkState)
				expect(createStatusMock.mock.calls[0][3]).to.equal(description)
				expect(createStatusMock.mock.calls[0][4]).to.equal('http://')
			},
		)
	})

	test.each([
		{
			testCaseName: 'for non-pull-request - should not create status',
			eventName: 'issues',
			action: 'milestoned',
			issueState: 'open',
			issuePayload: {},
		},
		{
			testCaseName: 'for non-pull-request - should not create status',
			eventName: 'issues',
			action: 'milestoned',
			issueState: 'closed',
			issuePayload: {},
		},
		{
			testCaseName: 'for non-pull-request - should not create status',
			eventName: 'issues',
			action: 'demilestoned',
			issueState: 'open',
			issuePayload: {},
		},
		{
			testCaseName: 'for non-pull-request - should not create status',
			eventName: 'issues',
			action: 'demilestoned',
			issueState: 'closed',
			issuePayload: {},
		},
		{
			testCaseName: 'for pull-request - should not create status',
			eventName: 'issues',
			action: 'milestoned',
			issueState: 'closed',
			issuePayload: { pull_request: {} },
		},
		{
			testCaseName: 'for pull-request - should not create status',
			eventName: 'issues',
			action: 'demilestoned',
			issueState: 'closed',
			issuePayload: { pull_request: {} },
		},
	])('$eventName - $action - $testCaseName', async ({ eventName, action, issueState, issuePayload }) => {
		const createStatusMock = jest.fn()
		const getPullRequestMock = jest.fn()
		const d = new Dispatcher({
			createStatus: createStatusMock,
			getPullRequest: getPullRequestMock,
		})
		const c = new MilestoneCheck({})
		c.subscribe(d)
		context.eventName = eventName
		context.payload = {
			action,
		}
		context.payload.issue = {
			state: issueState,
			...issuePayload,
		} as EventPayloads.WebhookPayloadIssuesIssue
		await d.dispatch(context)

		expect(getPullRequestMock.mock.calls.length).to.equal(0)
		expect(createStatusMock.mock.calls.length).to.equal(0)
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
})
