import { OctoKitIssue, OctoKit } from '../api/octokit'
import { getInput } from '../common/utils'
import { Action } from '../common/Action'
import { aiHandle } from '../common/telemetry'

class MetricsCollector extends Action {
	id = 'MetricsCollector'

	async onClosed(issue: OctoKitIssue) {
		const issueData = await issue.getIssue()

		const typeLabel = issueData.labels.find((label) => label.startsWith('type/'))
		const labels: Record<string, string> = {}

		if (typeLabel) {
			labels['type'] = typeLabel.substr(5)
		}

		aiHandle?.trackMetric({ name: 'issue.closed_count', value: 1, labels })
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async onOpened(_issue: OctoKitIssue) {
		aiHandle?.trackMetric({ name: 'issue.opened_count', value: 1 })
	}

	async onTriggered(octokit: OctoKit) {
		const repo = await octokit.getRepoInfo()
		aiHandle?.trackMetric({ name: 'repo.stargazers', value: repo.data.stargazers_count, type: 'gauge' })
		aiHandle?.trackMetric({ name: 'repo.watchers', value: repo.data.watchers_count, type: 'gauge' })
		aiHandle?.trackMetric({ name: 'repo.size', value: repo.data.size, type: 'gauge' })
		aiHandle?.trackMetric({ name: 'repo.forks', value: repo.data.forks_count, type: 'gauge' })
		aiHandle?.trackMetric({
			name: 'repo.open_issues_count',
			value: repo.data.open_issues_count,
			type: 'gauge',
		})

		const configPath = getInput('configPath')
		if (!configPath) {
			return
		}

		const config = (await octokit.readConfig(configPath)) as MetricsCollectorConfig
		for (const query of config.queries) {
			await this.countQuery(query.name, query.query, octokit)
		}
	}

	private async countQuery(name: string, query: string, octokit: OctoKit) {
		let count = 0

		for await (const page of octokit.query({ q: query })) {
			count += page.length
		}

		aiHandle?.trackMetric({
			name: `issue_query.${name}.gauge`,
			value: count,
			type: 'gauge',
		})
	}
}

interface QueryIssueCount {
	name: string
	query: string
}

interface MetricsCollectorConfig {
	queries: QueryIssueCount[]
}

new MetricsCollector().run() // eslint-disable-line
