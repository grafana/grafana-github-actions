import { GitHub, Issue } from '../api/api'
import { sortBy, difference } from 'lodash'
import { splitStringIntoLines } from '../common/utils'

export const CHANGELOG_LABEL = 'add to changelog'
export const GRAFANA_TOOLKIT_LABEL = 'area/grafana/toolkit'
export const GRAFANA_UI_LABEL = 'area/grafana/ui'
export const BREAKING_CHANGE_LABEL = 'breaking change'
export const BREAKING_SECTION_START = 'Release notice breaking change'
export const ENTERPRISE_LABEL = 'enterprise'

const githubGrafanaUrl = 'https://github.com/grafana/grafana'

export class ReleaseNotesBuilder {
	constructor(private octokit: GitHub, private enterprise?: GitHub) {}

	async buildReleaseNotes(version: string): Promise<string> {
		const lines: string[] = []
		const grafanaIssues: Issue[] = []
		const pluginDeveloperIssues: Issue[] = []
		const breakingChanges: string[] = []
		let headerLine: string | null = null

		for (const issue of await this.getIssuesForVersion(version)) {
			if (issueHasLabel(issue, CHANGELOG_LABEL)) {
				if (issueHasLabel(issue, GRAFANA_TOOLKIT_LABEL) || issueHasLabel(issue, GRAFANA_UI_LABEL)) {
					pluginDeveloperIssues.push(issue)
				} else {
					grafanaIssues.push(issue)
				}

				if (issueHasLabel(issue, BREAKING_CHANGE_LABEL)) {
					breakingChanges.push(...this.getBreakingChangeNotice(issue))
				}
			}

			if (!headerLine) {
				headerLine = await this.getReleaseHeader(version, issue.milestoneId!)
			}
		}

		if (headerLine) {
			lines.push(headerLine)
			lines.push('')
		}

		lines.push(...this.getGrafanaReleaseNotes(grafanaIssues))

		if (breakingChanges.length > 0) {
			lines.push('### Breaking changes')
			lines.push('')
			lines.push(...breakingChanges)
		}

		lines.push(...this.getPluginDevelopmentNotes(pluginDeveloperIssues))

		return lines.join('\n')
	}

	async getIssuesForVersion(version: string): Promise<Issue[]> {
		const issueList: Issue[] = []

		for await (const page of this.octokit.query({ q: `is:closed milestone:${version}` })) {
			for (const issue of page) {
				issueList.push(await issue.getIssue())
			}
		}

		for await (const page of this.octokit.query({
			q: `is:closed milestone:${version}`,
			repo: 'grafana-enterprise',
		})) {
			for (const issue of page) {
				const issueData = await issue.getIssue()
				issueData.labels = [...issueData.labels, ENTERPRISE_LABEL]
				issueList.push(issueData)
			}
		}

		return issueList
	}

	async getReleaseHeader(version: string, milestoneNumber: number): Promise<string> {
		const milestone = await this.octokit.getMilestone(milestoneNumber)

		if (milestone.closed_at) {
			const datePart = milestone.closed_at.split('T')[0]
			return `# ${version} (${datePart})`
		} else {
			return `# ${version} (unreleased)`
		}
	}

	private getBreakingChangeNotice(issue: Issue): string[] {
		const noticeLines: string[] = []
		let startFound = false

		for (const line of splitStringIntoLines(issue.body)) {
			if (startFound) {
				noticeLines.push(line)
			}

			if (line.indexOf(BREAKING_SECTION_START) >= 0) {
				startFound = true
			}
		}

		if (noticeLines.length > 0) {
			const lastLineIdx = noticeLines.length - 1
			noticeLines[lastLineIdx] = noticeLines[lastLineIdx] + ` Issue ${linkToIssue(issue)}`
			noticeLines.push('')
		}

		return noticeLines
	}

	private getPluginDevelopmentNotes(issues: Issue[]): string[] {
		if (issues.length === 0) {
			return []
		}

		const lines: string[] = ['### Plugin development fixes & changes', '']

		for (const issue of issues) {
			lines.push(this.getMarkdownLineForIssue(issue))
		}

		lines.push('')
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
			lines.push('')

			for (const item of notBugs) {
				lines.push(this.getMarkdownLineForIssue(item))
			}

			lines.push('')
		}

		if (bugs.length > 0) {
			lines.push('### Bug Fixes')
			lines.push('')

			for (const item of bugs) {
				lines.push(this.getMarkdownLineForIssue(item))
			}

			lines.push('')
		}

		return lines
	}

	private getMarkdownLineForIssue(item: Issue) {
		let markdown = ''
		let title: string = item.title.replace(/^([^:]*)/, (_match: any, g1: any) => {
			return `**${g1}**`
		})
		title = title.trim()
		if (title[title.length - 1] === '.') {
			title = title.slice(0, -1)
		}

		if (issueHasLabel(item, ENTERPRISE_LABEL)) {
			markdown += `* ${title}. (Enterprise)`
			return markdown
		}

		if (item.isPullRequest) {
			markdown += '* ' + title + '.'
			markdown += ` [#${item.number}](${githubGrafanaUrl}/pull/${item.number})`
			markdown += `, [@${item.author.name}](https://github.com/${item.author.name})`
		} else {
			markdown += '* ' + title + '.'
			markdown += ` ${linkToIssue(item)}`
		}

		return markdown
	}
}

function linkToIssue(item: Issue): string {
	return `[#${item.number}](${githubGrafanaUrl}/issues/${item.number})`
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
