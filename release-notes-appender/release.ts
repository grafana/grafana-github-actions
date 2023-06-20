import { EventPayloads } from '@octokit/webhooks'
import { context, GitHub } from '@actions/github'
import { error as logError, group } from '@actions/core'
import { exec } from '@actions/exec'
import escapeRegExp from 'lodash.escaperegexp'

import { FileAppender } from './FileAppender'
import { cloneRepo, setConfig } from '../common/git'

const labelMatcher = 'add-to-release-notes'

const createReleaseNotesPR = async ({
	pullRequestNumber: prNumber,
	pullRequestUrl: prUrl,
	pullRequestTitle: prTitle,
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
	pullRequestNumber: number
	pullRequestUrl: string
	pullRequestTitle: string
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

	await git('checkout', 'main')
	await git('pull')
	await git('switch', '--create', head)

	const fileAppender = new FileAppender({ cwd: repo })
	fileAppender.loadFile(releaseNotesFile)
	fileAppender.append(
		`-  **${prTitle}**: :warning: ADD DESCRIPTION HERE :warning:. [PR #${prNumber}](${prUrl})]`,
	)
	fileAppender.writeFile(releaseNotesFile)

	await git('add', releaseNotesFile)

	const body = 'Add PR #' + prNumber + ' to release notes for next release'
	await git('commit', '-m', body)

	await git('push', '--set-upstream', 'origin', head)
	const createRsp = await github.pulls.create({
		base: 'main',
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

const getFailedPRCommentBody = ({
	prNumber,
	prUrl,
	prTitle,
	releaseNotesFile,
	errorMessage,
	head,
}: {
	prNumber: number
	prUrl: string
	prTitle: string
	releaseNotesFile: string
	errorMessage: string
	head: string
}) => {
	return [
		`Failed to add PR #${prNumber} to the release notes`,
		'```',
		errorMessage,
		'```',
		'To create this PR manually, run these commands in your terminal:',
		'```bash',
		'# Fetch latest updates from GitHub',
		'git fetch',
		'# Create a new branch',
		`git switch --create ${head} origin/main`,
		'# Add the relevant PR to the release notes',
		`echo "* [PR #${prNumber}](${prUrl}) - ${prTitle}" >> ${releaseNotesFile}`,
		`git add ${releaseNotesFile}`,
		`git commit -m "Add PR #${prNumber} to release notes for next release`,
		'# Push it to GitHub',
		`git push --set-upstream origin ${head}`,
		`git switch main`,
		'# Remove the local branch',
		`git branch -D ${head}`,
		'```',
		`Then, create a pull request where the \`base\` branch is \`origin/main\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
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
	const payload = context.payload as EventPayloads.WebhookPayloadPullRequest
	console.log('payloadAction: ' + payload.action)
	let labelsString = labels.map(({ name }) => name)
	let matches = false
	for (const label of labelsString) {
		matches = labelMatcher === label
		if (matches) {
			break
		}
	}

	if (!matches) {
		console.log("PR doesn't contain label " + labelMatcher + '. Not adding to release notes.')
		return
	}

	if (!merged) {
		console.log('PR not merged')
		return
	}
	console.log('This is a merge action')

	await cloneRepo({ token, owner, repo })
	await setConfig('grafanabot')

	await group(`Adding ${pullRequestNumber} to release notes for next release`, async () => {
		let head = `add-${pullRequestNumber}-to-release-notes`
		let title = titleTemplate
		Object.entries({
			pullRequestNumber: pullRequestNumber.toString(),
			originalTitle,
		}).forEach(([name, value]) => {
			title = title.replace(new RegExp(escapeRegExp(`{{${name}}}`), 'g'), value)
		})

		try {
			await createReleaseNotesPR({
				pullRequestNumber,
				pullRequestTitle: originalTitle,
				pullRequestUrl: payload.pull_request.html_url,
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
					prNumber: pullRequestNumber,
					prUrl: payload.pull_request.html_url,
					prTitle: originalTitle,
					releaseNotesFile,
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

export { release }
