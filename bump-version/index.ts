// import { error as logError, getInput, setFailed } from '@actions/core'
import { context } from '@actions/github'
// import { EventPayloads } from '@octokit/webhooks'
// import { OctoKitIssue } from '../api/octokit'
import { Action } from '../common/Action'
import { exec } from '@actions/exec'
import { cloneRepo, setConfig } from '../common/git'
import fs from 'fs'
import { OctoKit } from '../api/octokit'
import { getVersionMatch } from './versions'
import { getInput } from '../common/utils'

class BumpVersion extends Action {
	id = 'BumpVersion'

	async onTriggered(octokit: OctoKit) {
		const { owner, repo } = context.repo
		const token = this.getToken()

		await cloneRepo({ token, owner, repo })
		await setConfig('grafana-delivery-bot')

		process.chdir(repo)

		if (!this.isCalledFromWorkflow()) {
			// Manually invoked the action
			const version = this.getVersion()
			const base = context.ref.substring(context.ref.lastIndexOf('/') + 1)
			await this.onTriggeredBase(octokit, base, version)
			return
		}

		// Action invoked by a workflow
		const version_call = this.getVersion()
		const matches = getVersionMatch(version_call)
		if (!matches || matches.length < 2) {
			throw new Error(
				'The input version format is not correct, please respect major.minor.patch or major.minor.patch-beta{number} format. Example: 7.4.3 or 7.4.3-beta1',
			)
		}

		let semantic_version = version_call

		// if the milestone is beta
		if (matches[2] !== undefined) {
			// transform the milestone to use semantic versioning
			// i.e 8.2.3-beta1 --> 8.2.3-beta.1
			semantic_version = version_call.replace('-beta', '-beta.')
		}

		const base = `v${matches[1]}.x`
		await this.onTriggeredBase(octokit, base, semantic_version)
	}

	async onTriggeredBase(octokit: OctoKit, base: string, version: string) {
		const { owner, repo } = context.repo
		const prBranch = `bump-version-${version}`
		const hasLerna = fs.existsSync('lerna.json')
		// Lerna was replaced with Nx release after 11.5.0. For backwards compatibility we support both
		const versionCmd = hasLerna
			? [
					'run',
					'lerna',
					'version',
					version,
					'--no-push',
					'--no-git-tag-version',
					'--force-publish',
					'--exact',
					'--yes',
			  ]
			: ['nx', 'release', 'version', version, '--groups', 'grafanaPackages,privatePackages,plugins']
		// create branch
		await git('switch', base)
		await git('switch', '--create', prBranch)
		// Install dependencies so that we can run versioning commands
		await exec('yarn', ['install'])
		// Update root package.json version
		await exec('npm', ['version', version, '--no-git-tag-version'])
		// Update the npm packages and plugins package.json versions to align with grafana version.
		await exec('yarn', versionCmd)

		try {
			//regenerate yarn.lock file
			//await exec('npm', ['install', '-g', 'corepack'])
			await exec('corepack', ['enable'])
			//await exec('yarn', ['set', 'version', '3.1.1'])
			await exec('yarn', ['--version'])
			await exec('yarn', ['install', '--mode', 'update-lockfile'])
		} catch (e) {
			console.error('yarn failed', e)
		}

		const precommitMakeTarget = getInput('precommit_make_target')
		if (precommitMakeTarget) {
			await exec('make', [precommitMakeTarget])
		}

		await git('commit', '-am', `"Release: Updated versions in package to ${version}"`)
		// push
		await git('push', '--set-upstream', 'origin', prBranch)
		const body = `Executed:\n
		npm version ${version} --no-git-tag-version\n
		yarn install\n
		yarn ${versionCmd.join(' ')}\n
		yarn install --mode update-lockfile
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
