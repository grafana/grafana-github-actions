// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts

import { error as logError, group, info } from '@actions/core'
import { exec, getExecOutput } from '@actions/exec'
import { GitHub } from '@actions/github'
import { betterer } from '@betterer/betterer'
import { EventPayloads } from '@octokit/webhooks'
import escapeRegExp from 'lodash.escaperegexp'
import { cloneRepo } from '../common/git'

const BETTERER_RESULTS_PATH = '.betterer.results'
const labelRegExp = /backport ([^ ]+)(?: ([^ ]+))?$/

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

const backportOnce = async ({
	base,
	body,
	commitToBackport,
	github,
	head,
	labelsToAdd,
	owner,
	repo,
	title,
	milestone,
	mergedBy,
}: {
	base: string
	body: string
	commitToBackport: string
	github: InstanceType<typeof GitHub>
	head: string
	labelsToAdd: string[]
	owner: string
	repo: string
	title: string
	milestone: EventPayloads.WebhookPayloadPullRequestPullRequestMilestone
	mergedBy: any
}) => {
	const git = async (...args: string[]) => {
		await exec('git', args, { cwd: repo })
	}

	const isBettererConflict = async () => {
		const { stdout } = await getExecOutput('git', ['diff', '--name-only', '--diff-filter=U'], {
			cwd: repo,
		})
		return stdout.trim() === BETTERER_RESULTS_PATH
	}

	const fixBettererConflict = async () => {
		await betterer({ update: true })
		await git('add', BETTERER_RESULTS_PATH)
		// Setting -c core.editor=true will prevent the commit message editor from opening
		await git('-c', 'core.editor=true', 'cherry-pick', '--continue')
	}

	await git('switch', base)
	await git('switch', '--create', head)
	try {
		await git('cherry-pick', '-x', commitToBackport)
	} catch (error) {
		if (await isBettererConflict()) {
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

	// Sync milestone
	if (milestone && milestone.id) {
		await github.issues.update({
			repo,
			owner,
			issue_number: pullRequestNumber,
			milestone: milestone.number,
		})
	}

	// Remove default reviewers
	if (createRsp.data.requested_reviewers) {
		const reviewers = createRsp.data.requested_reviewers.map((user) => user.login)
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

	if (labelsToAdd.length > 0) {
		await github.issues.addLabels({
			issue_number: pullRequestNumber,
			labels: labelsToAdd,
			owner,
			repo,
		})
	}
}

const getFailedBackportCommentBody = ({
	base,
	commitToBackport,
	errorMessage,
	head,
}: {
	base: string
	commitToBackport: string
	errorMessage: string
	head: string
}) => {
	return [
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
		'# Push it to GitHub',
		`git push --set-upstream origin ${head}`,
		`git switch main`,
		'# Remove the local backport branch',
		`git branch -D ${head}`,
		'```',
		`Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
	].join('\n')
}

interface BackportArgs {
	labelsToAdd: string[]
	payload: EventPayloads.WebhookPayloadPullRequest
	titleTemplate: string
	token: string
	github: GitHub
}

const backport = async ({
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
			milestone,
			merged_by,
		},
		repository: {
			name: repo,
			owner: { login: owner },
		},
	},
	titleTemplate,
	token,
	github,
}: BackportArgs) => {
	if (!merged) {
		console.log('PR not merged')
		return
	}

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

	await cloneRepo({ token, owner, repo })

	for (const [base, head] of Object.entries(backportBaseToHead)) {
		const body = `Backport ${commitToBackport} from #${pullRequestNumber}`

		let title = titleTemplate
		Object.entries({
			base,
			originalTitle,
		}).forEach(([name, value]) => {
			title = title.replace(new RegExp(escapeRegExp(`{{${name}}}`), 'g'), value)
		})

		await group(`Backporting to ${base} on ${head}`, async () => {
			try {
				await backportOnce({
					base,
					body,
					commitToBackport,
					github: github,
					head,
					labelsToAdd,
					owner,
					repo,
					title,
					milestone,
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
					}),
					issue_number: pullRequestNumber,
					owner,
					repo,
				})
			}
		})
	}
}

export { backport }
