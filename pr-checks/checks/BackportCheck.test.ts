import { context } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { expect } from 'chai'
import { Dispatcher } from '../Dispatcher'
import { CheckState } from '../types'
import { BackportCheck, defaultConfig } from './BackportCheck'

describe('BackportCheck', () => {
	describe('pull_request|labeled', () => {
		describe('Pull request closed', () => {
			it('Should not create status', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(0)
			})
		})

		describe('No skip labels|Not matching backport label', () => {
			it('Should create status failure', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.failure)
			})
		})

		describe('No skip labels|Matching backport label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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
						{ name: 'backport v7.2.x' },
						{ name: 'no-backport' },
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
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('One skip label set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('Two skip labels set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('One skip label set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('Two skip labels set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(0)
			})
		})

		describe('No skip labels|Not matching backport label', () => {
			it('Should create status failure', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Failure)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.failure)
			})
		})

		describe('No skip labels|Matching backport label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('One skip label set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('Two skip labels set|Not matching backport label, matching skip label', () => {
			it('Should create status success with skip message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportSkipped)
			})
		})

		describe('One skip label set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})

		describe('Two skip labels set|Matching backport label, matching skip label', () => {
			it('Should create status success with enabled message', async () => {
				const createStatusMock = jest.fn()
				const getPullRequestMock = jest.fn()
				const d = new Dispatcher({
					createStatus: createStatusMock,
					getPullRequest: getPullRequestMock,
				})
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

				expect(getPullRequestMock.mock.calls.length).to.equal(0)
				expect(createStatusMock.mock.calls.length).to.equal(1)
				expect(createStatusMock.mock.calls[0][0]).to.equal('123')
				expect(createStatusMock.mock.calls[0][1]).to.equal(defaultConfig.title)
				expect(createStatusMock.mock.calls[0][2]).to.equal(CheckState.Success)
				expect(createStatusMock.mock.calls[0][3]).to.equal(defaultConfig.backportEnabled)
			})
		})
	})
})
