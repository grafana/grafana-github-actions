/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai'
import { expect as jestExpect } from '@jest/globals'
import { TestbedIssue } from '../api/testbed'
import { Command, Commands } from './Commands'

describe('Commands', () => {
	describe('Comments', () => {
		it('Close (team member)', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [{ type: 'comment', action: 'close', allowUsers: [], name: 'hello' }]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'NotJacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Close (allowed third party)', async () => {
			const testbed = new TestbedIssue()
			const commands: Command[] = [
				{ type: 'comment', action: 'close', allowUsers: ['JacksonKearl'], name: 'hello' },
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'NotJacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Close (allowed all third parties)', async () => {
			const testbed = new TestbedIssue()
			const commands: Command[] = [
				{ type: 'comment', action: 'close', allowUsers: ['*'], name: 'hello' },
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'Rando' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Close (allowed author)', async () => {
			const testbed = new TestbedIssue()
			const commands: Command[] = [
				{ type: 'comment', action: 'close', allowUsers: ['@author'], name: 'hello' },
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'NotJacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Close (disallowedLabel)', async () => {
			const testbed = new TestbedIssue({}, { labels: ['nope'] })
			const commands: Command[] = [
				{
					type: 'comment',
					action: 'close',
					allowUsers: ['@author'],
					name: 'hello',
					disallowLabel: 'nope',
				},
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
		})

		it('Close (allowedLabel)', async () => {
			const testbed = new TestbedIssue({}, { labels: ['nope'] })
			const commands: Command[] = [
				{
					type: 'comment',
					action: 'close',
					allowUsers: ['@author'],
					name: 'hello',
					requireLabel: 'pope',
				},
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
		})

		it('Update Labels', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] }, { labels: ['old', 'veryOld'] })
			const commands: Command[] = [
				{
					type: 'comment',
					allowUsers: [],
					name: 'hello',
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'NotJacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {
				comment: '/hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).labels).not.to.contain('old')
			expect((await testbed.getIssue()).labels).to.contain('new')
		})

		it('Prefix matches', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [{ type: 'comment', action: 'close', allowUsers: [], name: 'hello' }]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/helloworld',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '\\hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Regex Escapes', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [
				{ type: 'comment', action: 'close', allowUsers: [], name: 'c++iscool' },
			]

			expect((await testbed.getIssue()).open).to.equal(true)
			await new Commands(testbed, commands, {
				comment: '/c++iscool',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('adds labels to issues with /label comment', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [{ type: 'comment', allowUsers: [], name: 'label' }]
			await new Commands(testbed, commands, {
				comment: '/label hello "hello world"',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).labels).to.include('hello')
			expect((await testbed.getIssue()).labels).to.include('hello world')
		})

		it('adds assignees to issues with /assign comment', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [{ type: 'comment', allowUsers: [], name: 'assign' }]
			await new Commands(testbed, commands, {
				comment: '/assign Jackso \r\n',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).assignee).to.equal('Jackso')
		})

		it('removes labels with - prefix in /label comment', async () => {
			const testbed = new TestbedIssue(
				{ writers: ['JacksonKearl'] },
				{ labels: ['hello', 'hello world'] },
			)
			const commands: Command[] = [{ type: 'comment', allowUsers: [], name: 'label' }]
			await new Commands(testbed, commands, {
				comment: '/label -hello -"hello world" "-hello"',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).labels).not.to.include('hello')
			expect((await testbed.getIssue()).labels).not.to.include('hello world')
			expect((await testbed.getIssue()).labels).to.include('-hello')
		})

		it('removes assignees with - prefix in /assign comment', async () => {
			const testbed = new TestbedIssue(
				{ writers: ['JacksonKearl'] },
				{ issue: { assignee: 'JacksonKearl' } },
			)
			const commands: Command[] = [{ type: 'comment', allowUsers: [], name: 'assign' }]
			await new Commands(testbed, commands, {
				comment: '/assign -JacksonKearl \r\n',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).assignee).to.equal(undefined)
		})
	})

	describe('Labels', () => {
		it('close', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [{ type: 'label', action: 'close', name: 'hello' }]

			await new Commands(testbed, commands, {
				label: 'hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
		})

		it('Comments', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] })
			const commands: Command[] = [
				{
					type: 'label',
					action: 'close',
					comment: 'myComment',
					name: 'hello',
				},
			]

			await new Commands(testbed, commands, {
				label: 'hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
			const comments = []
			for await (const page of testbed.getComments()) {
				comments.push(...page)
			}
			expect(comments[0].body).to.equal('myComment')
		})

		it('But doesnt comment when the issue was closed', async () => {
			const testbed = new TestbedIssue({ writers: ['JacksonKearl'] }, { issue: { open: false } })
			const commands: Command[] = [
				{
					type: 'label',
					action: 'close',
					comment: 'myComment',
					name: 'hello',
				},
			]

			await new Commands(testbed, commands, {
				label: 'hello',
				user: { name: 'JacksonKearl' },
			}).run()
			expect((await testbed.getIssue()).open).to.equal(false)
			const comments = []
			for await (const page of testbed.getComments()) {
				comments.push(...page)
			}
			expect(comments[0]).to.be.undefined
		})
	})

	describe('Files changed', () => {
		it('Labels with matched files changed', async () => {
			const pullRequestFilenames = [
				'backend/backend.go',
				'backend/a/b/c/c.go',
				'src/app.ts',
				'src/app.ts/a/b/c/c.ts',
			]
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
				},
				{
					labels: ['old', 'veryOld'],
					pullRequestFilenames,
				},
			)
			const commands: Command[] = [
				{
					type: 'changedfiles',
					name: 'area/backend',
					matches: ['backend/**/*'],
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).not.to.contain('old')
			expect((await testbed.getIssue()).labels).to.contain('new')
		})

		it('Labels without matched files changed', async () => {
			const pullRequestFilenames = [
				'backend/backend.go',
				'backend/a/b/c/c.go',
				'src/app.ts',
				'src/app.ts/a/b/c/c.ts',
			]
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
				},
				{
					labels: ['old', 'veryOld'],
					pullRequestFilenames,
				},
			)
			const commands: Command[] = [
				{
					type: 'changedfiles',
					name: 'area/backend',
					matches: ['frontend/**/*'],
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')
		})
	})

	describe('Author', () => {
		it('Labels not when author is not member of organization', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: false,
				},
				{
					labels: ['old', 'veryOld'],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					memberOf: { org: 'grafana' },
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')
		})

		it('Labels when author is member of organization', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: true,
				},
				{
					labels: ['old', 'veryOld'],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					memberOf: { org: 'grafana' },
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).not.to.contain('old')
			expect((await testbed.getIssue()).labels).to.contain('new')
		})

		it('Labels and comments when author is member of org and adds no labels', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: true,
				},
				{
					labels: [],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					memberOf: { org: 'grafana' },
					noLabels: true,
					addLabel: 'internal',
					comment: ' please add a label',
				},
			]

			expect(((await testbed.getIssue()).labels.length = 0))

			await new Commands(testbed, commands, {}).run()

			expect(((await testbed.getIssue()).labels.length = 1))
			expect((await testbed.getIssue()).labels).to.contain('internal')
			const comments = []
			for await (const page of testbed.getComments()) {
				comments.push(...page)
			}
			expect(comments[0].body).to.equal('@JacksonKearl please add a label')
		})

		it('Does not add label or comment when author is NOT member of org and creates issue with no labels', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: false,
				},
				{
					labels: [],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					memberOf: { org: 'grafana' },
					noLabels: true,
					addLabel: 'internal',
					comment: ' please add a label',
				},
			]

			expect(((await testbed.getIssue()).labels.length = 0))

			await new Commands(testbed, commands, {}).run()

			expect(((await testbed.getIssue()).labels.length = 0))
			const comments = []
			for await (const page of testbed.getComments()) {
				comments.push(...page)
			}
			expect(comments.length).to.equal(0)
		})

		it('Labels not when author is member of organization', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: true,
				},
				{
					labels: ['old', 'veryOld'],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					notMemberOf: { org: 'grafana' },
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')
		})

		it('Labels when author is not member of organization', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: false,
				},
				{
					labels: ['old', 'veryOld'],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					notMemberOf: { org: 'grafana' },
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).not.to.contain('old')
			expect((await testbed.getIssue()).labels).to.contain('new')
		})

		it('Labels not when author is in the ignoreList', async () => {
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
					userMemberOfOrganization: false,
				},
				{
					labels: ['old', 'veryOld'],
				},
			)
			const commands: Command[] = [
				{
					type: 'author',
					name: 'Grafana author',
					notMemberOf: { org: 'grafana' },
					ignoreList: ['JacksonKearl'],
					addLabel: 'new',
					removeLabel: 'old',
				},
			]

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')

			await new Commands(testbed, commands, {}).run()

			expect((await testbed.getIssue()).labels).to.contain('old')
			expect((await testbed.getIssue()).labels).not.to.contain('new')
		})
	})

	describe('Add Issue to Project', () => {
		it('Expect the getProjectNodeId and addIssueToProject to be called with right project id and org', async () => {
			// arrange
			const testProjectUrl = 'https://github.com/orgs/grafana/projects/76'
			const testProjectId = 76
			const testLabel = 'plugins-platform'
			const testColumnName = 'To Do'
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
				},
				{
					labels: ['some-other-label', 'plugins-platform'],
				},
			)
			const spyAddIssueToProject = jest
				.spyOn(testbed, 'addIssueToProject')
				.mockReturnValue(Promise.resolve())

			// act
			const commands: Command[] = [
				{
					type: 'label',
					action: 'addToProject',
					addToProject: {
						url: testProjectUrl,
						column: testColumnName,
					},
					name: testLabel,
				},
			]
			await new Commands(testbed, commands, { label: testLabel }).run()

			// assert
			jestExpect(spyAddIssueToProject).toHaveBeenCalledWith(
				testProjectId,
				await testbed.getIssue(),
				undefined,
				testColumnName,
			)
			jestExpect(spyAddIssueToProject).toHaveBeenCalledTimes(1)
		})

		it('Expect the to skip adding project if labels are not matching', async () => {
			// arrange
			const testProjectUrl = 'https://github.com/orgs/grafana/projects/76'
			const testOrgName = 'testOrg'
			const testLabel = 'plugins-platform'
			const testbed = new TestbedIssue(
				{
					writers: ['JacksonKearl'],
				},
				{
					labels: ['some-other-label', 'another-label'],
				},
			)
			const spyAddIssueToProject = jest
				.spyOn(testbed, 'addIssueToProject')
				.mockReturnValue(Promise.resolve())

			// act
			const commands: Command[] = [
				{
					type: 'label',
					action: 'addToProject',
					addToProject: {
						url: testProjectUrl,
						column: 'To Do',
						org: testOrgName,
					},
					name: 'plugins-platform',
				},
			]
			await new Commands(testbed, commands, { label: testLabel }).run()

			// assert
			jestExpect(spyAddIssueToProject).toHaveBeenCalledTimes(0)
		})
	})
})
