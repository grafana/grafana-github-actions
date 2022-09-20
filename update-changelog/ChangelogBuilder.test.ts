import dotenv from 'dotenv'
import { Query } from '../api/api'
import { OctoKit } from '../api/octokit'
import { Testbed, TestbedIssueConstructorArgs } from '../api/testbed'
import {
	ChangelogBuilder,
	BREAKING_SECTION_START,
	DEPRECATION_SECTION_START,
	BUG_LABEL,
	CHANGELOG_LABEL,
	GRAFANA_UI_LABEL,
} from './ChangelogBuilder'

describe('ChangelogBuilder', () => {
	it('Should build correct release notes', async () => {
		const issues: TestbedIssueConstructorArgs[] = [
			{
				issue: {
					title: 'Has no labels',
				},
			},
			{
				issue: {
					title: 'Alerting: Fixed really bad issue',
				},
				labels: [CHANGELOG_LABEL],
			},
			{
				issue: {
					title: 'Login: New feature',
				},
				labels: [CHANGELOG_LABEL],
			},
			{
				issue: {
					title: 'Auth: Prevent errors from happening',
				},
				labels: [CHANGELOG_LABEL, BUG_LABEL],
			},
			{
				issue: {
					title: 'API: Fixed api issue',
					isPullRequest: true,
					author: {
						name: 'torkelo',
					},
				},
				labels: [CHANGELOG_LABEL],
			},
			{
				issue: {
					title: 'Button: Changed prop name for button',
					isPullRequest: true,
					author: {
						name: 'torkelo',
					},
				},
				labels: [CHANGELOG_LABEL, GRAFANA_UI_LABEL],
			},
			{
				issue: {
					title: 'Dashboard: Issue with deprecation notice',
					body: `
asdasd
asdasd

### ${BREAKING_SECTION_START}
Here is the content of this breaking change notice.`,
					isPullRequest: true,
					author: {
						name: 'torkelo',
					},
				},
				labels: [CHANGELOG_LABEL],
			},
			{
				issue: {
					title: 'Variables: Variables deprecated',
					body: `
asdasd
asdasd

### ${DEPRECATION_SECTION_START}
Variables have been deprecated`,
					isPullRequest: true,
					author: {
						name: 'torkelo',
					},
				},
				labels: [CHANGELOG_LABEL],
			},
		]
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const queryRunner = async function* (_: Query): AsyncIterableIterator<TestbedIssueConstructorArgs[]> {
			yield issues
		}

		const testbed = new Testbed({
			queryRunner,
			milestone: { closed_at: '2020-11-11T17:15:26Z', number: 123, title: '7.3.3' },
		})

		const builder = new ChangelogBuilder(testbed, '7.3.3')
		const text = await builder.buildChangelog({ useDocsHeader: false })
		expect(text).toMatchSnapshot('v1')
	})

	it('Should be able to get notes with docs header', async () => {
		const issues: TestbedIssueConstructorArgs[] = [
			{
				issue: {
					title: 'Alerting: Fixed really bad issue',
				},
				labels: [CHANGELOG_LABEL],
			},
		]
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const queryRunner = async function* (_: Query): AsyncIterableIterator<TestbedIssueConstructorArgs[]> {
			yield issues
		}

		const testbed = new Testbed({
			queryRunner,
			milestone: { closed_at: '2020-11-11T17:15:26Z' },
		})

		const builder = new ChangelogBuilder(testbed, '7.3.3')
		// Calling this first as this is how  it's used from the action
		await builder.buildChangelog({ useDocsHeader: false })
		const text = await builder.buildChangelog({ useDocsHeader: true })
		expect(text).toMatchInlineSnapshot(`
		"# Release notes for Grafana 7.3.3

		### Bug fixes

		- **Alerting:** Fixed really bad issue. [#1](https://github.com/grafana/grafana/issues/1)
		- **Alerting:** Fixed really bad issue. (Enterprise)
		"
	`)

		expect(builder.getTitle()).toBe('Release notes for Grafana 7.3.3')
	})

	it.skip('integration test', async () => {
		dotenv.config()

		const token = process.env.TOKEN
		const repo = process.env.REPO
		const owner = process.env.OWNER

		const octokit = new OctoKit(token, { repo, owner })
		const builder = new ChangelogBuilder(octokit, '1.0.0')
		const text = await builder.buildChangelog({})
		console.log(text)
		expect(text).toEqual('asd')
	})
})
