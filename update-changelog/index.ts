// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
import { OctoKit } from '../api/octokit'
import { FileUpdater } from './FileUpdater'
import { ChangelogBuilder } from './ChangelogBuilder'
import { writeDocsFiles } from './writeDocsFiles'

class UpdateChangelog extends Action {
	id = 'UpdateChangelog'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const token = this.getToken()
		const version = this.getVersion()

		await cloneRepo({ token, owner, repo })

		process.chdir(repo)

		const fileUpdater = new FileUpdater()
		const builder = new ChangelogBuilder(octokit, version)
		const changelogFile = './CHANGELOG.md'
		const branchName = 'update-changelog'
		const changelog = await builder.buildChangelog({ useDocsHeader: false })
		const title = `Changelog: Updated changelog for ${version}`

		// Update main changelog
		fileUpdater.loadFile(changelogFile)
		fileUpdater.update({
			version: version,
			content: changelog,
		})
		fileUpdater.writeFile(changelogFile)

		await writeDocsFiles({ version, builder })
		await npx(
			'prettier',
			'--no-config',
			'--trailing-comma',
			'es5',
			'--single-quote',
			'--print-width',
			'120',
			'--list-different',
			'**/*.md',
			'--write',
		)

		// look for the branch
		let branchExists
		try {
			await git(
				'ls-remote',
				'--heads',
				'--exit-code',
				`https://github.com/${owner}/${repo}.git`,
				branchName,
			)
			branchExists = true
		} catch (e) {
			branchExists = false
		}

		// we delete the branch which also will delete the associated PR
		if (branchExists) {
			// check if there are open PR's
			const pulls = await octokit.octokit.pulls.list({
				owner,
				repo,
				head: `${owner}:${branchName}`,
			})

			// close open PRs
			for (const pull of pulls.data) {
				// leave a comment explaining why we're closing this PR
				await octokit.octokit.issues.createComment({
					body: `This pull request has been closed because an updated changelog and release notes have been generated.`,
					issue_number: pull.number,
					owner,
					repo,
				})

				// close pr
				await octokit.octokit.pulls.update({
					owner,
					repo,
					pull_number: pull.number,
					state: 'closed',
				})
			}
			// delete the branch
			await git('push', 'origin', '--delete', branchName)
		}

		await git('switch', '--create', branchName)
		await git('add', '-A')
		await git('commit', '-m', `${title}`)
		await git('push', '--set-upstream', 'origin', branchName)

		await octokit.octokit.pulls.create({
			base: 'main',
			body: 'This exciting! So much has changed!\nDO NOT CHANGE THE TITLES DIRECTLY IN THIS PR, everything in the PR is auto-generated.',
			head: branchName,
			owner,
			repo,
			title,
		})
	}
}

const git = async (...args: string[]) => {
	// await exec('git', args, { cwd: repo })
	await exec('git', args)
}

const npx = async (...args: string[]) => {
	await exec('npx', args)
}

new UpdateChangelog().run() // eslint-disable-line
