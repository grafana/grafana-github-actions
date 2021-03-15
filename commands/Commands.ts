/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GitHubIssue, Issue, User } from '../api/api'
import { checkMatch, MatchConfig } from '../common/globmatcher'
import { trackEvent } from '../common/telemetry'

/* eslint-disable */
// confusing when eslint formats
export type Command = { name: string } & (
	| { type: 'comment'; allowUsers: string[] }
	| { type: 'label' }
	| { type: 'changedfiles'; matches: string | string[] | { any: string[] } | { all: string[] } }
) & {
		action?: 'close'
	} & Partial<{ comment: string; addLabel: string; removeLabel: string }> &
	Partial<{ requireLabel: string; disallowLabel: string }>
/* eslint-enable */

export class Commands {
	constructor(
		private github: GitHubIssue,
		private config: Command[],
		private action: { label: string } | { comment: string; user: User } | {},
	) {}

	private async matches(command: Command, issue: Issue, changedFiles: string[]): Promise<boolean> {
		if (command.requireLabel && !issue.labels.includes(command.requireLabel)) {
			return false
		}
		if (command.disallowLabel && issue.labels.includes(command.disallowLabel)) {
			return false
		}

		if ('label' in this.action) {
			return command.type === 'label' && this.action.label === command.name
		}

		if ('comment' in this.action) {
			return (
				command.type === 'comment' &&
				!!this.action.comment.match(
					new RegExp(`(/|\\\\)${escapeRegExp(command.name)}(\\s|$)`, 'i'),
				) &&
				((await this.github.hasWriteAccess(this.action.user)) ||
					command.allowUsers.includes(this.action.user.name) ||
					command.allowUsers.includes('*') ||
					(this.action.user.name === issue.author.name && command.allowUsers.includes('@author')))
			)
		}

		if (command.type === 'changedfiles' && command.matches) {
			let matchCfg: MatchConfig = {
				all: [],
				any: [],
			}

			if (typeof command.matches === 'string') {
				matchCfg.any = [command.matches as string]
			} else if ('any' in command.matches) {
				matchCfg.any = command.matches.any
			} else if ('all' in command.matches) {
				matchCfg.all = command.matches.all
			} else {
				matchCfg.any = command.matches
			}

			const matches = checkMatch(changedFiles, matchCfg)
			if (!matches && command.addLabel !== undefined && command.removeLabel === undefined) {
				command.removeLabel = command.addLabel
				command.addLabel = undefined
				return true
			}

			return matches
		}

		return false
	}

	private async perform(command: Command, issue: Issue, changedFiles: string[]) {
		if (!(await this.matches(command, issue, changedFiles))) return
		console.log(`Running command ${command.name}:`)

		await trackEvent(this.github, 'command', { name: command.name })

		const tasks = []

		if ('comment' in this.action && (command.name === 'label' || command.name === 'assign')) {
			const args: { task: 'add' | 'remove'; name: string }[] = []
			let argList = (
				this.action.comment.match(
					new RegExp(String.raw`(?:\\|/)${command.name}(.*)(?:\r)?(?:\n|$)`),
				)?.[1] ?? ''
			).trim()
			while (argList) {
				const task = argList[0] === '-' ? 'remove' : 'add'
				if (task === 'remove') argList = argList.slice(1)

				if (argList[0] === '"') {
					const endIndex = argList.indexOf('"', 1)
					if (endIndex === -1)
						throw Error('Unable to parse arglist. Could not find matching double quote')
					args.push({ task, name: argList.slice(1, endIndex) })
					argList = argList.slice(endIndex + 1).trim()
				} else {
					const endIndex = argList.indexOf(' ', 1)
					if (endIndex === -1) {
						args.push({ task, name: argList })
						argList = ''
					} else {
						args.push({ task, name: argList.slice(0, endIndex) })
						argList = argList.slice(endIndex + 1).trim()
					}
				}
			}

			if (command.name === 'label') {
				tasks.push(
					...args.map((arg) =>
						arg.task === 'add'
							? this.github.addLabel(arg.name)
							: this.github.removeLabel(arg.name),
					),
				)
			}

			if (command.name === 'assign') {
				tasks.push(
					...args.map((arg) =>
						arg.task === 'add'
							? this.github.addAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name)
							: this.github.removeAssignee(arg.name[0] === '@' ? arg.name.slice(1) : arg.name),
					),
				)
			}
		}

		if (command.action === 'close') {
			tasks.push(this.github.closeIssue())
		}

		if (command.comment && (command.action !== 'close' || issue.open)) {
			tasks.push(this.github.postComment(command.comment))
		}

		if (command.addLabel) {
			tasks.push(this.github.addLabel(command.addLabel))
		}

		if (command.removeLabel) {
			tasks.push(this.github.removeLabel(command.removeLabel))
		}

		await Promise.all(tasks)
	}

	async run() {
		const issue = await this.github.getIssue()
		let changedFiles: string[] = []

		if (this.config.find((cmd) => cmd.type === 'changedfiles') !== undefined) {
			changedFiles = await this.github.listPullRequestFilenames()
		}

		return Promise.all(this.config.map((command) => this.perform(command, issue, changedFiles)))
	}
}

// From user CoolAJ86 on https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex
function escapeRegExp(string: string) {
	return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}
