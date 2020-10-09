/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKitIssue, OctoKit } from '../api/octokit'
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
		await this.countQuery('type_bug', 'label:"type/bug" is:open', octokit)
		await this.countQuery('needs_investigation', 'label:"needs investigation" is:open', octokit)
		await this.countQuery('needs_more_info', 'label:"needs more info" is:open', octokit)
		await this.countQuery('unlabeled', 'is:open is:issue no:label', octokit)
		await this.countQuery('milestone_7_3_open', 'is:open is:issue milestone:7.3 ', octokit)
		await this.countQuery('open_prs', 'is:open is:pr', octokit)
	}

	private async countQuery(name: string, query: string, octokit: OctoKit) {
		let count = 0

		for await (const page of octokit.query({ q: query })) {
			count += page.length
		}

		aiHandle?.trackMetric({
			name: `issue_query.${name}.count`,
			value: count,
			type: 'gauge',
		})
	}
}

new MetricsCollector().run() // eslint-disable-line
