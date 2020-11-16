import { GitHub, Issue } from '../api/api'
import { sortBy, difference } from 'lodash'

export const CHANGELOG_LABEL = 'add to changelog'
export const GRAFANA_TOOLKIT_LABEL = 'area/grafana/toolkit'
export const GRAFANA_UI_LABEL = 'area/grafana/ui'
export const BREAKING_CHANGE_LABEL = 'breaking change'

export class ReleaseNotesBuilder {
	constructor(private octokit: GitHub) {}

	async getText(milestone: string): Promise<string> {
		const lines: string[] = []
		const grafanaIssues: Issue[] = []
		const pluginDeveloperIssues: Issue[] = []

		for await (const page of this.octokit.query({ q: `is:closed milestone:${milestone}` })) {
			for (const issue of page) {
				const issueData = await issue.getIssue()
				if (issueHasLabel(issueData, CHANGELOG_LABEL)) {
					if (
						issueHasLabel(issueData, GRAFANA_TOOLKIT_LABEL) ||
						issueHasLabel(issueData, GRAFANA_UI_LABEL)
					) {
						pluginDeveloperIssues.push(issueData)
					} else {
						grafanaIssues.push(issueData)
					}
				}
			}
		}

		lines.push(...this.getGrafanaReleaseNotes(grafanaIssues))
		lines.push(...this.getPluginDevelopmentNotes(pluginDeveloperIssues))

		return lines.join('\r\n')
	}

	private getPluginDevelopmentNotes(issues: Issue[]): string[] {
		if (issues.length === 0) {
			return []
		}

		const lines: string[] = ['### Plugin development fixes & changes']

		for (const issue of issues) {
			lines.push(this.getMarkdownLineForIssue(issue))
		}

		return lines
	}

	private getGrafanaReleaseNotes(issues: Issue[]): string[] {
		if (issues.length === 0) {
			return []
		}

		const lines: string[] = []
		const bugs = sortBy(issues.filter(isBugFix), 'title')
		const notBugs = sortBy(difference(issues, bugs), 'title')

		if (notBugs.length > 0) {
			lines.push('### Features / Enhancements')

			for (const item of notBugs) {
				lines.push(this.getMarkdownLineForIssue(item))
			}

			lines.push('')
		}

		if (bugs.length > 0) {
			lines.push('### Bug Fixes')

			for (const item of bugs) {
				lines.push(this.getMarkdownLineForIssue(item))
			}

			lines.push('')
		}

		return lines
	}

	private getMarkdownLineForIssue(item: Issue) {
		const githubGrafanaUrl = 'https://github.com/grafana/grafana'
		let markdown = ''
		let title: string = item.title.replace(/^([^:]*)/, (_match: any, g1: any) => {
			return `**${g1}**`
		})
		title = title.trim()
		if (title[title.length - 1] === '.') {
			title = title.slice(0, -1)
		}

		if (item.isPullRequest) {
			markdown += '* ' + title + '.'
			markdown += ` [#${item.number}](${githubGrafanaUrl}/pull/${item.number})`
			markdown += `, [@${item.author.name}](https://github.com/${item.author.name})`
		} else {
			markdown += '* ' + title + '.'
			markdown += ` [#${item.number}](${githubGrafanaUrl}/issues/${item.number})`
		}

		return markdown
	}
}

function issueHasLabel(issue: Issue, label: string) {
	return issue.labels && issue.labels.indexOf(label) !== -1
}

function isBugFix(item: Issue) {
	if (item.title.match(/fix|fixes/i)) {
		return true
	}
	if (item.labels.find((label: any) => label.name === 'type/bug')) {
		return true
	}
	return false
}
