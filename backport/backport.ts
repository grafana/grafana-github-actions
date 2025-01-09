// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts

import { error as logError, group, info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { context, GitHub } from '@actions/github'
import { betterer } from '@betterer/betterer'
import { EventPayloads } from '@octokit/webhooks'
import escapeRegExp from 'lodash.escaperegexp'
import { cloneRepo, setConfig } from '../common/git'
import { OctoKitIssue } from '../api/octokit'

export const BETTERER_RESULTS_PATH = '.betterer.results'
export const LABEL_ADD_TO_CHANGELOG = 'add to changelog'
export const LABEL_NO_CHANGELOG = 'no-changelog'
const labelRegExp = /backport ([^ ]+)(?: ([^ ]+))?$/
const backportLabels = ['type/docs', 'type/bug', 'product-approved', 'type/ci']
const missingLabels = 'missing-labels'

const getLabelNames = ({
	action,
	label,
	labels,
}: {
	action: EventPayloads.WebhookPayloadPullRequest['action']
	label: { name: string }
	labels: EventPayloads.WebhookPayloadPullRequest['pull_request']['labels']
}): string[] => {
	switch (action) {
		case 'closed':
			return labels.map(({ name }) => name)
		case 'labeled':
			return [label.name]
		default:
			return []
	}
}

function getMatchedBackportLabels(labelsPR: string[], backportLabels: string[]): string[] {
	let matchedLabels = []
	for (const prLabel of labelsPR) {
		for (let backportLabel of backportLabels) {
			if (backportLabel === prLabel) {
				matchedLabels.push(backportLabel)
			}
		}
	}
	return matchedLabels
}

const getBackportBaseToHead = ({
	action,
	label,
	labels,
	pullRequestNumber,
}: {
	action: EventPayloads.WebhookPayloadPullRequest['action']
	label: { name: string }
	labels: EventPayloads.WebhookPayloadPullRequest['pull_request']['labels']
	pullRequestNumber: number
}): { [base: string]: string } => {
	const baseToHead: { [base: string]: string } = {}

	getLabelNames({ action, label, labels }).forEach((labelName) => {
		const matches = labelRegExp.exec(labelName)

		if (matches !== null) {
			const [, base, head = `backport-${pullRequestNumber}-to-${base}`] = matches
			baseToHead[base] = head
		}
	})

	return baseToHead
}

export const isBettererConflict = async (gitUnmergedPaths: string[]) => {
	return gitUnmergedPaths.length === 1 && gitUnmergedPaths[0] === BETTERER_RESULTS_PATH
}

const backportOnce = async ({
	base,
	body,
	commitToBackport,
	github,
	head,
	labelsToAdd,
	removeDefaultReviewers,
	owner,
	repo,
	title,
	mergedBy,
}: {
	base: string
	body: string
	commitToBackport: string
	github: InstanceType<typeof GitHub>
	head: string
	labelsToAdd: string[]
	removeDefaultReviewers: boolean
	owner: string
	repo: string
	title: string
	mergedBy: any
}) => {
	const git = async (...args: string[]) => {
		await exec('git', args, { cwd: repo })
	}

	const gitDiffUnmergedPaths = async (): Promise<string[]> => {
		const { stdout } = await getExecOutput('git', ['diff', '--name-only', '--diff-filter=U'], {
			cwd: repo,
		})

		return stdout.trim().split(/\r?\n/)
	}

	const fixBettererConflict = async () => {
		await betterer({ update: true, cwd: repo })
		await git('add', BETTERER_RESULTS_PATH)
		// Setting -c core.editor=true will prevent the commit message editor from opening
		await git('-c', 'core.editor=true', 'cherry-pick', '--continue')
	}

	await git('switch', base)
	await git('switch', '--create', head)
	try {
		await git('cherry-pick', '-x', commitToBackport)
	} catch (error) {
		const gitUnmergedPaths = await gitDiffUnmergedPaths()

		if (await isBettererConflict(gitUnmergedPaths)) {
			try {
				await fixBettererConflict()
			} catch (error) {
				await git('cherry-pick', '--abort')
				throw error
			}
		} else {
			await git('cherry-pick', '--abort')
			throw error
		}
	}

	await git('push', '--set-upstream', 'origin', head)
	const createRsp = await github.pulls.create({
		base,
		body,
		head,
		owner,
		repo,
		title,
	})

	const pullRequestNumber = createRsp.data.number

	// Set the milestone first in order to avoid failing milestone checks (where possible):
	if (/^v\d+\.\d+\.x$/.test(base)) {
		const milestoneName = base.substring(1)
		const allMilestones = await github.issues.listMilestonesForRepo({ owner, repo, state: 'open' })
		const milestone = allMilestones.data.find(
			(milestone: { title: string }) => milestone.title === milestoneName,
		)
		if (milestone) {
			await github.issues.update({
				repo,
				owner,
				issue_number: pullRequestNumber,
				milestone: milestone.number,
			})
		} else {
			console.log('No matching milestone found. Manual assignment necessary.')
		}
	}

	if (labelsToAdd.length > 0) {
		await github.issues.addLabels({
			issue_number: pullRequestNumber,
			labels: labelsToAdd,
			owner,
			repo,
		})
	}

	// Remove default reviewers
	if (removeDefaultReviewers && createRsp.data.requested_reviewers) {
		const reviewers = createRsp.data.requested_reviewers.map((user: { login: string }) => user.login)
		await github.pulls.deleteReviewRequest({
			pull_number: pullRequestNumber,
			repo,
			owner,
			reviewers: reviewers,
		})
	}

	if (mergedBy) {
		// Assign to merger
		await github.pulls.createReviewRequest({
			pull_number: pullRequestNumber,
			repo,
			owner,
			reviewers: [mergedBy.login],
		})
	}
}

export const getFailedBackportCommentBody = ({
	base,
	commitToBackport,
	errorMessage,
	head,
	title,
	originalNumber,
	labels,
	hasBody,
}: {
	base: string
	commitToBackport: string
	errorMessage: string
	head: string
	title: string
	originalNumber: number
	labels: string[]
	hasBody: boolean
}) => {
	const backportMilestone = base.startsWith('v') ? base.substring(1) : base
	const escapedTitle = title.replaceAll('"', '\\"')
	const baseBody = `Backport ${commitToBackport} from #${originalNumber}`
	const joinedLabels = labels.map((l) => `--label '${l}'`).join(' ')
	let lines = [
		`The backport to \`${base}\` failed:`,
		'```',
		errorMessage,
		'```',
		'To backport manually, run these commands in your terminal:',
		'```bash',
		'# Fetch latest updates from GitHub',
		'git fetch',
		'# Create a new branch',
		`git switch --create ${head} origin/${base}`,
		'# Cherry-pick the merged commit of this pull request and resolve the conflicts',
		`git cherry-pick -x ${commitToBackport}`,
		'```',
		'When the conflicts are resolved, stage and commit the changes:',
		'```',
		'git add . && git cherry-pick --continue',
		'```',
		'If you have the [GitHub CLI](https://cli.github.com/) installed:',
		'```bash',
	]

	if (hasBody) {
		lines = lines.concat([
			'# Push the branch to GitHub:',
			`git push --set-upstream origin ${head}`,
			'# Create the PR body template',
			`PR_BODY=$(gh pr view ${originalNumber} --json body --template 'Backport ${commitToBackport} from #${originalNumber}{{ "\\n\\n---\\n\\n" }}{{ index . "body" }}')`,
			`# Create the PR on GitHub`,
			`echo "$\{PR_BODY\}" | gh pr create --title '${escapedTitle}' --body-file - ${joinedLabels} --base ${base} --milestone ${backportMilestone} --web`, //eslint-disable-line
		])
	} else {
		lines = lines.concat([
			'# Push the branch to GitHub:',
			`git push --set-upstream origin ${head}`,
			`# Create the PR on GitHub`,
			`gh pr create --title '${escapedTitle}' --body '${baseBody}' ${joinedLabels} --base ${base} --milestone ${backportMilestone} --web`,
		])
	}

	lines = lines.concat([
		'```',
		`Or, if you don't have the GitHub CLI installed ([we recommend you install it!](https://github.com/cli/cli#installation)):`,
		'```bash',
		'# Push the branch to GitHub:',
		`git push --set-upstream origin ${head}`,
		'',
		`# Create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
		'',
		'# Remove the local backport branch',
		`git switch main`,
		`git branch -D ${head}`,
		'```',
	])

	return lines.join('\n')
}

interface BackportArgs {
	issue: OctoKitIssue
	labelsToAdd: string[]
	payload: EventPayloads.WebhookPayloadPullRequest
	titleTemplate: string
	removeDefaultReviewers: boolean
	token: string
	github: GitHub
	sender: EventPayloads.PayloadSender
}

const backport = async ({
	issue,
	labelsToAdd,
	payload: {
		action,
		label,
		pull_request: {
			labels,
			merge_commit_sha: mergeCommitSha,
			merged,
			number: pullRequestNumber,
			title: originalTitle,
			merged_by,
		},
		repository: {
			name: repo,
			owner: { login: owner },
		},
	},
	titleTemplate,
	removeDefaultReviewers,
	token,
	github,
	sender,
}: BackportArgs) => {
	const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
	console.log('payloadAction: ' + payload.action)
	if (payload.action !== 'closed') {
		let payloadLabel = typeof payload.label?.name === 'string' ? payload.label.name : ''
		if (!(labelRegExp.test(payloadLabel) || backportLabels.includes(payloadLabel))) {
			return
		}
	}
	let labelsString = labels.map(({ name }) => name)
	let matchedLabels = getMatchedBackportLabels(labelsString, backportLabels)
	let matches = false
	for (const label of labelsString) {
		matches = labelRegExp.test(label)
		if (matches) {
			break
		}
	}
	// don't execute the rest of the backport if there's no backport label present
	if (!matches) {
		return
	}
	if (matches && matchedLabels.length == 0 && !labelsString.includes(missingLabels)) {
		console.log(
			'PR intended to be backported, but not labeled properly. Labels: ' +
				labelsString +
				'\n Author: ' +
				sender.login,
		)
		await github.issues.createComment({
			body: [
				'Hello ' + '@' + sender.login + '!',
				'Backport pull requests need to be either:',
				'* Pull requests which address bugs,',
				'* Urgent fixes which need product approval, in order to get merged,',
				'* Docs changes.\n',
				'Please, if the current pull request addresses a bug fix, label it with the `type/bug` label.',
				'If it already has the product approval, please add the `product-approved` label. For docs changes, please add the `type/docs` label.',
				'If the pull request modifies CI behaviour, please add the `type/ci` label.',
				'If none of the above applies, please consider removing the backport label and target the next major/minor release.',
				'Thanks!',
			].join('\n'),
			issue_number: pullRequestNumber,
			owner,
			repo,
		})
		await github.issues.addLabels({
			issue_number: pullRequestNumber,
			labels: [missingLabels],
			owner,
			repo,
		})
		return
	} else if (matches && matchedLabels.length != 0 && labelsString.includes(missingLabels)) {
		await github.issues.removeLabel({
			owner,
			repo,
			issue_number: pullRequestNumber,
			name: missingLabels,
		})
	}

	const ghIssue = await issue.getIssue()

	if (!merged) {
		console.log('PR not merged')
		for await (const cmt of issue.getComments()) {
			if (
				cmt.at.toString().indexOf('This PR must be merged before a backport PR will be created.') >= 0
			) {
				return
			}
		}
		await github.issues.createComment({
			body: 'This PR must be merged before a backport PR will be created.',
			issue_number: pullRequestNumber,
			owner,
			repo,
		})
		return
	}
	console.log('This is a merge action')

	const backportBaseToHead = getBackportBaseToHead({
		action,
		// The payload has a label property when the action is "labeled".
		label: label!,
		labels,
		pullRequestNumber,
	})

	if (Object.keys(backportBaseToHead).length === 0) {
		return
	}

	// The merge commit SHA is actually not null.
	const commitToBackport = String(mergeCommitSha)
	info(`Backporting ${commitToBackport} from #${pullRequestNumber}`)

	const originalLabels = ghIssue.labels
	const prLabels = Array.from(getFinalLabels(originalLabels, labelsToAdd).values())

	await cloneRepo({ token, owner, repo })
	await setConfig('grafana-delivery-bot')

	for (const [base, head] of Object.entries(backportBaseToHead)) {
		const issueHasBody = !!ghIssue.body
		const bodySuffix = issueHasBody ? `\n\n---\n\n${ghIssue.body}` : ''
		const body = `Backport ${commitToBackport} from #${pullRequestNumber}${bodySuffix}`

		let title = titleTemplate
		Object.entries({
			base,
			originalTitle,
		}).forEach(([name, value]) => {
			title = title.replace(new RegExp(escapeRegExp(`{{${name}}}`), 'g'), value)
		})

		// Add the matched backport labels of the main PR
		labelsToAdd.push(...matchedLabels)

		await group(`Backporting to ${base} on ${head}`, async () => {
			try {
				await backportOnce({
					base,
					body,
					commitToBackport,
					github: github,
					head,
					labelsToAdd: prLabels,
					removeDefaultReviewers,
					owner,
					repo,
					title,
					mergedBy: merged_by,
				})
			} catch (error) {
				const errorMessage: string =
					error instanceof Error ? error.message : 'Unknown error while backporting'
				logError(errorMessage)

				// Create comment
				await github.issues.createComment({
					body: getFailedBackportCommentBody({
						base,
						commitToBackport,
						errorMessage,
						head,
						title,
						originalNumber: pullRequestNumber,
						labels: prLabels,
						hasBody: issueHasBody,
					}),
					issue_number: pullRequestNumber,
					owner,
					repo,
				})
				// Add backport-failed label to failed backports
				await github.issues.addLabels({
					issue_number: pullRequestNumber,
					labels: ['backport-failed'],
					owner,
					repo,
				})
			}
		})
	}
}

/**
 * getFinalLabels provides the final list of labels that should be set for the
 * new pull-request.
 *
 * @param originalLabels labels provided by the original pull request
 * @param labelsToAdd labels requested to be added by configuration
 */
export function getFinalLabels(originalLabels: string[], labelsToAdd: string[]): Set<string> {
	const result = new Set<string>(originalLabels)
	// Remove all the labels that started with `backport .*`
	for (const label of originalLabels) {
		if (label === 'backport-failed' || labelRegExp.test(label)) {
			result.delete(label)
		}
	}
	for (const label of labelsToAdd) {
		result.add(label)
		switch (label) {
			case LABEL_ADD_TO_CHANGELOG:
				result.delete(LABEL_NO_CHANGELOG)
				break
			case LABEL_NO_CHANGELOG:
				result.delete(LABEL_ADD_TO_CHANGELOG)
				break
		}
	}
	return result
}

export { backport }
