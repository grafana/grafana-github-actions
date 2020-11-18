import dotenv from 'dotenv'
import { Query } from '../api/api'
import { OctoKit } from '../api/octokit'
import { Testbed, TestbedIssueConstructorArgs } from '../api/testbed'
import {
	ReleaseNotesBuilder,
	CHANGELOG_LABEL,
	GRAFANA_UI_LABEL,
	BREAKING_CHANGE_LABEL,
	BREAKING_SECTION_START,
	ENTERPRISE_LABEL,
} from './ReleaseNotesBuilder'

describe('ReleaseNotesBuilder', () => {
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
				labels: [CHANGELOG_LABEL, BREAKING_CHANGE_LABEL],
			},
		]

		const queryRunner = async function* (
			query: Query,
		): AsyncIterableIterator<TestbedIssueConstructorArgs[]> {
			yield issues
		}

		const testbed = new Testbed({
			queryRunner,
			milestone: { closed_at: '2020-11-11T17:15:26Z' },
		})

		const builder = new ReleaseNotesBuilder(testbed, '7.3.3')
		const text = await builder.buildReleaseNotes({ useDocsHeader: false })
		expect(text).toMatchSnapshot()
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

		const queryRunner = async function* (
			query: Query,
		): AsyncIterableIterator<TestbedIssueConstructorArgs[]> {
			yield issues
		}

		const testbed = new Testbed({
			queryRunner,
			milestone: { closed_at: '2020-11-11T17:15:26Z' },
		})

		const builder = new ReleaseNotesBuilder(testbed, '7.3.3')
		const text = await builder.buildReleaseNotes({ useDocsHeader: true })
		expect(text).toMatchInlineSnapshot(`
		"# Release notes for Grafana 7.3.3

		### Bug fixes

		* **Alerting**: Fixed really bad issue. [#1](https://github.com/grafana/grafana/issues/1)
		* **Alerting**: Fixed really bad issue. (Enterprise)
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
		const builder = new ReleaseNotesBuilder(octokit)
		const text = await builder.buildReleaseNotes('7.3.2')
		console.log(text)
		expect(text).toEqual('asd')
	})
})
