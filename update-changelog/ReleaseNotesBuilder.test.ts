import dotenv from 'dotenv'
import { Query } from '../api/api'
import { OctoKit } from '../api/octokit'
import { Testbed, TestbedIssueConstructorArgs } from '../api/testbed'
import { ReleaseNotesBuilder, CHANGELOG_LABEL } from './ReleaseNotesBuilder'

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
		]

		const queryRunner = async function* (
			query: Query,
		): AsyncIterableIterator<TestbedIssueConstructorArgs[]> {
			yield issues
		}

		const testbed = new Testbed({ queryRunner })
		const builder = new ReleaseNotesBuilder(testbed)
		const text = await builder.getText('7.3.3')
		expect(text).toMatchSnapshot()
	})

	it.skip('integration test', async () => {
		dotenv.config()

		const token = process.env.TOKEN
		const repo = process.env.REPO
		const owner = process.env.OWNER

		const octokit = new OctoKit(token, { repo, owner })
		const builder = new ReleaseNotesBuilder(octokit)
		const text = await builder.getText('7.3.3')
		console.log(text)
		expect(text).toEqual('asd')
	})
})
