import { expect } from 'chai'
import {
	ChangelogCheck,
	containsBreakingChangeNotice,
	defaultChangelogLabelCheckConfig,
	defaultConfig,
	isTitleValid,
} from './ChangelogCheck'
import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'

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
		action: 'edited',
	},
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
		action: 'edited',
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

describe('ChangelogCheck', () => {
	describe('Pull request closed', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should not create status',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({ labels: { matches: ['test'] } })
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

	describe('No changelog labels', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status failure with not exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'test' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultChangelogLabelCheckConfig.notExists)
			},
		)
	})

	describe('Skip changelog label added', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with skipped message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					labels: [{ name: 'no-changelog' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultChangelogLabelCheckConfig.skipped)
			},
		)
	})

	describe('Add to changelog label added|Invalid title', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status failure with formatted exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					title: 'test',
					labels: [{ name: 'add to changelog' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(
					`${defaultChangelogLabelCheckConfig.exists} - ${defaultConfig.invalidTitle}`,
				)
			},
		)
	})

	describe('Add to changelog label added|Valid title', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with formatted exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					title: 'Area: Some description',
					labels: [{ name: 'add to changelog' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(
					`${defaultChangelogLabelCheckConfig.exists} - ${defaultConfig.valid}`,
				)
			},
		)
	})

	describe('Add to changelog label added|Breaking change label not added|Valid title', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with formatted exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					breakingChangeLabels: ['breaking-change'],
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					title: 'Area: Some description',
					labels: [{ name: 'add to changelog' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(
					`${defaultChangelogLabelCheckConfig.exists} - ${defaultConfig.valid}`,
				)
			},
		)
	})

	describe('Add to changelog label added|Breaking change label added|Valid title|Breaking change notice missing', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status failure with formatted exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					breakingChangeLabels: ['breaking-change'],
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					title: 'Area: Some description',
					labels: [{ name: 'add to changelog' }, { name: 'breaking-change' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(
					`${defaultChangelogLabelCheckConfig.exists} - ${defaultConfig.breakingChangeNoticeMissing}`,
				)
			},
		)
	})

	describe('Add to changelog label added|Breaking change label added|Valid title|Breaking change notice added', () => {
		test.each(eventsAndActions)(
			'$eventName - $action - Should create status success with formatted exists message',
			async ({ eventName, action }) => {
				const api = mockAPI()
				const d = new Dispatcher({
					createStatus: api.createStatus,
					getPullRequest: api.getPullRequest,
				})
				const c = new ChangelogCheck({
					labels: { matches: ['add to changelog'] },
					breakingChangeLabels: ['breaking-change'],
					skip: {
						matches: ['no-changelog'],
					},
				})
				c.subscribe(d)
				context.eventName = eventName
				context.payload = {
					action: action,
				}
				context.payload.pull_request = {
					state: 'open',
					title: 'Area: Some description',
					body: 'Some\r\n\t# Release notice breaking change\n\nI broke this thing.\n',
					labels: [{ name: 'add to changelog' }, { name: 'breaking-change' }],
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(
					`${defaultChangelogLabelCheckConfig.exists} - ${defaultConfig.valid}`,
				)
			},
		)
	})
})

describe('isTitleValid', () => {
	test.each([
		{ str: '', valid: false },
		{ str: 'test', valid: false },
		{ str: ' Test: Test', valid: true },
		{ str: ' Test: Test.', valid: true },
		{ str: ' Test:  Test.', valid: false },
		{ str: ' test: Test .', valid: false },
		{ str: ' Test: test .', valid: false },
		{
			str: 'Azure Monitor: Fix space character encoding for metrics query link to Azure Portal',
			valid: true,
		},
		{ str: 'CloudWatch: Prevent log groups from being removed on query change', valid: true },
		{ str: 'Cloudwatch: Fix template variables in variable queries', valid: true },
		{ str: 'Explore: Prevent direct access to explore if disabled via feature toggle', valid: true },
		{ str: 'InfluxDB: Fixes invalid no data alerts', valid: true },
		{ str: 'Navigation: Prevent navbar briefly showing on login', valid: true },
		{ str: 'Plugins Catalog: Fix styling of hyperlinks', valid: true },
		{ str: 'Table: Fix filter crashes table', valid: true },
		{ str: 'TimeSeries: Properly stack series with missing datapoints', valid: true },
		{ str: 'E2E: Changes in e2e package', valid: true },
		{ str: 'Tempo / Trace Viewer: Support Span Links in Trace Viewer', valid: true },
		{ str: 'SSE: Add Mode to drop NaN/Inf/Null in Reduction operations', valid: true },
		{
			str: 'Postgres/MySQL/MSSQL: Cancel in-flight SQL query if user cancels query in grafana',
			valid: true,
		},
		// The title can also contain a version prefix since this will be
		// filtered out by the changelog generator:
		{ str: '[v10.0.x] Table: Fix filter crashes table', valid: true },
		{ str: '[v9.1.x] Table: Fix filter crashes table', valid: true },
		{ str: '[release-11.0.1] Table: Fix filter crashes table', valid: true },
		{ str: '[v10.0] Table: Fix filter crashes table', valid: true },
		{ str: '[v10.0.x]: Table: Fix filter crashes table', valid: false },
		{ str: '[10.0.x] Table: Fix filter crashes table', valid: true },
		{ str: '[] Table: Fix filter crashes table', valid: false },
	])(`string='$str', expected: $valid`, async ({ str, valid }) => {
		const isValid = isTitleValid(str)
		expect(isValid).to.be.equal(valid)
	})
})

describe('containsBreakingChangeNotice', () => {
	test.each([
		{ str: '', valid: false },
		{ str: '# Release notice breaking change', valid: true },
		{ str: 'test\r\ntest\n\ntest\n# Release notice breaking change\r\ntest\n', valid: true },
	])(`string='$str', expected: $valid`, async ({ str, valid }) => {
		const isValid = containsBreakingChangeNotice(str)
		expect(isValid).to.be.equal(valid)
	})
})
