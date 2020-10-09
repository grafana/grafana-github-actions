/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { Action } from '../common/Action'
import { aiHandle } from '../common/telemetry'

class CommandsRunner extends Action {
	id = 'Commands'

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

	async onOpened(issue: OctoKitIssue) {
		aiHandle?.trackMetric({
			name: 'issue.opened_count',
			value: 1,
		})
	}
}

new CommandsRunner().run() // eslint-disable-line
