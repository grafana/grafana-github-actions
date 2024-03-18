import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { PullRequest } from '../../api/api'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { MilestoneCheck } from './MilestoneCheck'

const prEvents = ['pull_request', 'pull_request_target']
const prActions = ['opened', 'reopened', 'ready_for_review', 'synchronize']

const prTestCases = prEvents
	.flatMap((event) => {
		return prActions.map((action) => ({
			eventName: event,
			action: action,
		}))
	})
	.flatMap((tc) => [
		{
			testCaseName: 'without milestone set, when base branch is not specified in PR payload',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Failure,
			description: 'Failed',
			pull_request_payload: {},
		},
		{
			testCaseName: 'without milestone set, with `main` as base branch',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Failure,
			description: 'Failed',
			pull_request_payload: { milestone: undefined, base: { ref: 'main' } },
		},
		{
			testCaseName: 'without milestone set, with version branch as base branch',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Failure,
			description: 'Failed',
			pull_request_payload: { milestone: undefined, base: { ref: 'v10.2.3' } },
		},
		{
			testCaseName: 'with milestone set, when base branch is not specified in PR payload',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Success,
			description: 'Milestone set',
			pull_request_payload: { milestone: {} },
		},
		{
			testCaseName: 'with milestone set, with `main` as base branch',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Success,
			description: 'Milestone set',
			pull_request_payload: { milestone: {}, base: { ref: 'main' } },
		},
		{
			testCaseName: 'with milestone set, with version branch as base branch',
			eventName: tc.eventName,
			action: tc.action,
			checkState: CheckState.Success,
			description: 'Milestone set',
			pull_request_payload: { milestone: {}, base: { ref: 'v10.2.3' } },
		},
	])

describe('MilestoneCheck', () => {
	describe('Pull Requests', () => {
		test.each(prTestCases)(
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
