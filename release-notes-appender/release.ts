import { error as logError, group } from '@actions/core'
import { context, GitHub } from '@actions/github'
import { EventPayloads } from '@octokit/webhooks'
import { cloneRepo } from '../common/git'
import { exec } from '@actions/exec'
import escapeRegExp from 'lodash.escaperegexp'
import { FileAppender } from './FileAppender'

const labelRegExp = /release notes ([^ ]+)(?: ([^ ]+))?$/

const createReleaseNotesPR = async ({
	base,
	prNumber,
	prUrl,
	prTitle,
	releaseNotesFile,
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
	prNumber: number
	prUrl: string
	prTitle: string
	releaseNotesFile: string
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

	await git('switch', base)
	await git('switch', '--create', head)

	const fileAppender = new FileAppender()
	fileAppender.loadFile(releaseNotesFile)
	fileAppender.append('* [PR #' + prNumber + '](' + prUrl + ') - ' + prTitle)
	fileAppender.writeFile(releaseNotesFile)

	await git('add', releaseNotesFile)

	const body = 'Add PR #' + prNumber + ' to release notes for release ' + base
	await git('commit', '-m', body)

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
			const [, base, head = `add-${pullRequestNumber}-to-release-notes-${base}`] = matches
			baseToHead[base] = head
		}
	})

	return baseToHead
}

const getFailedPRCommentBody = ({
	base,
	errorMessage,
	head,
}: {
	base: string
	errorMessage: string
	head: string
}) => {
	return [
		`The backport to \`${base}\` failed:`,
		'```',
		errorMessage,
		'```',
		'To create PR manually, run these commands in your terminal:',
		'```bash',
		'# Fetch latest updates from GitHub',
		'git fetch',
		'# Create a new branch',
		`git switch --create ${head} origin/${base}`,
		'# Add the relevant PR to the release notes',
		'# TODO: include commands for adding PR to release notes',
		'# Push it to GitHub',
		`git push --set-upstream origin ${head}`,
		`git switch main`,
		'# Remove the local branch',
		`git branch -D ${head}`,
		'```',
		`Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
	].join('\n')
}

interface ReleaseArgs {
	labelsToAdd: string[]
	payload: EventPayloads.WebhookPayloadPullRequest
	titleTemplate: string
	releaseNotesFile: string
	token: string
	github: GitHub
	sender: EventPayloads.PayloadSender
}
const release = async ({
	labelsToAdd,
	payload: {
		action,
		label,
		pull_request: {
			labels,
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
	releaseNotesFile,
	token,
	github,
}: ReleaseArgs) => {
	//TODO create interface type for arguments
	const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
	console.log('payloadAction: ' + payload.action)
	let labelsString = labels.map(({ name }) => name)
	let matches = false
	for (const label of labelsString) {
		matches = labelRegExp.test(label)
		if (matches) {
			break
		}
	}

	if (!merged) {
		console.log('PR not merged')
		return
	}
	console.log('This is a merge action')

	//TODO: Note that base here is the release version, not any sort of branch
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

	await cloneRepo({ token, owner, repo })

	for (const [base, head] of Object.entries(backportBaseToHead)) {
		let title = titleTemplate
		Object.entries({
			base,
			originalTitle,
		}).forEach(([name, value]) => {
			title = title.replace(new RegExp(escapeRegExp(`{{${name}}}`), 'g'), value)
		})

		await group(`Creating PR for ${head} to ${base}`, async () => {
			try {
				await createReleaseNotesPR({
					base,
					prNumber: pullRequestNumber,
					prTitle: originalTitle,
					prUrl: payload.pull_request.html_url,
					releaseNotesFile,
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
					body: getFailedPRCommentBody({
						base,
						errorMessage,
						head,
					}),
					issue_number: pullRequestNumber,
					owner,
					repo,
				})
				// Add release-notes-failed label to failures
				await github.issues.addLabels({
					issue_number: pullRequestNumber,
					labels: ['release-notes-failed'],
					owner,
					repo,
				})
			}
		})
	}
}

export { release }
