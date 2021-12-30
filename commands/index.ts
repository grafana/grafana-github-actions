/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { OctoKitIssue } from '../api/octokit'
import { getRequiredInput } from '../common/utils'
import { Commands } from './Commands'
import { Action } from '../common/Action'

class CommandsRunner extends Action {
	id = 'Commands'

	async onCommented(issue: OctoKitIssue, comment: string, actor: string) {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, { comment, user: { name: actor } }).run()
	}

	async onLabeled(issue: OctoKitIssue, label: string) {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, { label }).run()
	}

	async onOpened(issue: OctoKitIssue): Promise<void> {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, {}).run()
	}

	async onSynchronized(issue: OctoKitIssue): Promise<void> {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, {}).run()
	}

	async onReopened(issue: OctoKitIssue): Promise<void> {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, {}).run()
	}
	async onUnlabeled(issue: OctoKitIssue, label: string) {
		const commands = await issue.readConfig(getRequiredInput('configPath'))
		await new Commands(issue, commands, { label }).run()
	}
}

new CommandsRunner().run() // eslint-disable-line
