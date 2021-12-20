// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo } from '../common/git'
// import fs from 'fs'
import { OctoKit } from '../api/octokit'
import { EventPayloads } from '@octokit/webhooks'

class BumpVersion extends Action {
	id = 'BumpVersion'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const token = this.getToken()
		const payload = context.payload as EventPayloads.WebhookPayloadWorkflowDispatch
		const version = (payload.inputs as any).version
		const version_call = (payload.inputs as any).version_call

		if (!version) {
			throw new Error('Missing version input')
		}

		await cloneRepo({ token, owner, repo })

		process.chdir(repo)

		const base = context.ref.substring(context.ref.lastIndexOf('/') + 1)
		const prBranch = `bump-version-${version}`

		// create branch
		await git('switch', base)
		await git('switch', '--create', prBranch)

		// Update version
		await exec('npm', ['version', version, '--no-git-tag-version'])
		await exec('npx', [
			'lerna',
			'version',
			version,
			'--no-push',
			'--no-git-tag-version',
			'--force-publish',
			'--exact',
			'--yes',
		])
		try {
			//regenerate yarn.lock file
			await exec('yarn', undefined, { env: { YARN_ENABLE_IMMUTABLE_INSTALLS: 'false' } })
		} catch (e) {
			console.error('yarn failed', e)
		}

		await git('commit', '-am', `"Release: Updated versions in package to ${version}"`)

		// push
		await git('push', '--set-upstream', 'origin', prBranch)

		const body = `Executed:\n
npm version ${version} --no-git-tag-version\n
npx lerna version ${version} --no-push --no-git-tag-version --force-publish --exact --yes
yarn
`
		await octokit.octokit.pulls.create({
			base,
			body,
			head: prBranch,
			owner,
			repo,
			title: `Release: Bump version to ${version}`,
		})
	}
}

const git = async (...args: string[]) => {
	// await exec('git', args, { cwd: repo })
	await exec('git', args)
}

new BumpVersion().run() // eslint-disable-line
