/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKitIssue, OctoKit } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { Action } from '../common/Action'
import { aiHandle } from '../common/telemetry'

class MetricsCollector extends Action {
	id = 'MetricsCollector'

	async onClosed(issue: OctoKitIssue) {
		const issueData = await issue.getIssue()

		const typeLabel = issueData.labels.find(label => label.startsWith('type/'))
		const labels: Record<string, string> = {}

		if (typeLabel) {
			labels['type'] = typeLabel.substr(5)
		}

		aiHandle?.trackMetric({
			name: 'issue.closed_count',
			value: 1,
			labels,
		})
	}

	async onOpened(_issue: OctoKitIssue) {
		aiHandle?.trackMetric({
			name: 'issue.opened_count',
			value: 1,
		})
	}

	async onTriggered(octokit: OctoKit) {
		await this.count('type/bug', octokit)
		await this.count('needs more info', octokit)
		await this.count('needs investigation', octokit)
		await this.countUnlabeled(octokit)
	}

	private async count(label: string, octokit: OctoKit) {
		const query = `label:"${label}" is:open`
		let count = 0

		for await (const page of octokit.query({ q: query })) {
			count += page.length
		}

		aiHandle?.trackMetric({
			name: `issue.open_issues_by_label`,
			value: count,
			labels: {
				label: `${label}`,
			},
		})
	}

	private async countUnlabeled(octokit: OctoKit) {
		const query = `is:open is:issue no:label`
		let count = 0

		for await (const page of octokit.query({ q: query })) {
			count += page.length
		}

		aiHandle?.trackMetric({
			name: `issue.open_issues_without_label`,
			value: count,
		})
	}
}

new MetricsCollector().run() // eslint-disable-line
