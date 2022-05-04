import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { LabelCheck, defaultConfig, stringMatchesLabel } from './LabelCheck'

function mockAPI() {
	return {
		getPullRequest: jest.fn(),
		createStatus: jest.fn(),
		listStatusesByRef: jest.fn(),
	}
}

const eventsAndActions = [
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
]

describe('LabelCheck', () => {
	describe('Pull request closed', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should not create status',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({ labels: { matches: ['test'] } })
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'closed',
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(0)
			},
		)
	})

	describe('No skip labels|Not matching label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status failure with not exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({ labels: { matches: ['backport v*'] }, skip: { matches: [] } })
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [
						{ name: 'add to changelog' },
						{ name: 'backport' },
						{ name: 'backport ' },
						{ name: 'no-backport' },
					],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.notExists)
			},
		)
	})

	describe('No skip labels|Matching label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({ labels: { matches: ['backport v*'] } })
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [
						{ name: 'add to changelog' },
						{ name: 'backport' },
						{ name: 'backport v7.2.x' },
						{ name: 'no-backport' },
					],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.exists)
			},
		)
	})

	describe('One skip label set|Not matching label, matching skip label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with skip message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({
					labels: { matches: ['backport v*'] },
					skip: { matches: ['backport'] },
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'backport' }, { name: 'backport ' }, { name: 'no-backport' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.skipped)
			},
		)
	})

	describe('Two skip labels set|Not matching label, matching skip label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with skip message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({
					labels: { matches: ['backport v*'] },
					skip: { matches: ['backport', 'no-backport'] },
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'add to changelog' }, { name: 'backport ' }, { name: 'no-backport' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.skipped)
			},
		)
	})

	describe('One skip label set|Matching label, matching skip label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({
					labels: { matches: ['backport v*'] },
					skip: { matches: ['backport'] },
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'backport' }, { name: 'backport v8.3.x' }, { name: 'no-backport' }],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.exists)
			},
		)
	})

	describe('Two skip labels set|Matching label, matching skip label', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new LabelCheck({
					labels: { matches: ['backport v*'] },
					skip: { matches: ['backport', 'no-backport'] },
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [
						{ name: 'add to changelog' },
						{ name: 'backport v10.0.x' },
						{ name: 'no-backport' },
					],
					head: {
						sha: '123',
					},
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(1)
				expect(api.createStatus.mock.calls[0][0]).to.equal('123')
				expect(api.createStatus.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(api.createStatus.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.exists)
			},
		)
	})
})

describe('stringMatchesLabel', () => {
	test.each([
		{ str: '', label: 'abc', shouldMatch: false },
		{ str: 'backport', label: 'backport v8.5.x', shouldMatch: false },
		{ str: 'backport ', label: 'backport v8.5.x', shouldMatch: false },
		{ str: '*', label: 'abc', shouldMatch: true },
		{ str: 'backport v*', label: 'backport v8.5.x', shouldMatch: true },
	])(`string='$str', label='$label', expected: $shouldMatch`, async ({ str, label, shouldMatch }) => {
		const matches = stringMatchesLabel(str, label)
		expect(matches).to.be.equal(shouldMatch)
	})
})
