import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { Dispatcher } from '../Dispatcher'
import { Subscriber } from '../Subscriber'
import { CheckState } from '../types'
import { BackportCheck, defaultConfig } from './BackportCheck'

function mockAPI() {
	return {
		getPullRequest: jest.fn(),
		createStatus: jest.fn(),
		listStatusesByRef: jest.fn(),
	}
}

describe('BackportCheck', () => {
	describe('pull_request|labeled', () => {
		describe('Pull request closed', () => {
			it('Should not create status', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
				}
				context.payload.pull_request = {
					state: 'closed',
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(0)
			})
		})

		describe('No skip labels|Not matching backport label', () => {
			it('Should create status failure', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: [] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.failure)
			})
		})

		describe('No skip labels|Matching backport label', () => {
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
				'$eventName - $action - Should create status success with enabled message',
				async ({ eventName, action }) => {
					const api = mockAPI()
					const d = new Dispatcher(api, new Subscriber())
					const c = new BackportCheck({ skipLabels: [] })
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
					expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
				},
			)
		})

		describe('One skip label set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('Two skip labels set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport', 'no-backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('One skip label set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('Two skip labels set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport', 'no-backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'labeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})
	})

	describe('pull_request|unlabeled', () => {
		describe('Pull request closed', () => {
			it('Should not create status', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({})
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
				}
				context.payload.pull_request = {
					state: 'closed',
				} as EventPayloads.WebhookPayloadPullRequestPullRequest
				await d.dispatch(context)

				expect(api.getPullRequest.mock.calls.length).to.equal(0)
				expect(api.createStatus.mock.calls.length).to.equal(0)
			})
		})

		describe('No skip labels|Not matching backport label', () => {
			it('Should create status failure', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: [] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.failure)
			})
		})

		describe('No skip labels|Matching backport label', () => {
			it('Should create status success with enabled message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: [] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('One skip label set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('Two skip labels set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport', 'no-backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('One skip label set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('Two skip labels set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const api = mockAPI()
				const d = new Dispatcher(api, new Subscriber())
				const c = new BackportCheck({ skipLabels: ['backport', 'no-backport'] })
				c.subscribe(d)
				context.eventName = 'pull_request'
				context.payload = {
					action: 'unlabeled',
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
				expect(api.createStatus.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})
	})
})
