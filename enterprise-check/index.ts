import { Action } from '../common/Action'
import { Octokit } from '@octokit/rest'
import { OctoKit } from '../api/octokit'
import { getInput, setFailed, debug } from '@actions/core'
import { RequestError } from '@octokit/request-error'

class EnterpriseCheck extends Action {
	id = 'EnterpriseCheck'

	async createRef(octokit: OctoKit) {
		debug('Getting source branch from input...')
		const sourceBranch = getInput('source_branch')
		if (!sourceBranch) {
			throw new Error('Missing source branch')
		}

		debug('Getting PR number from input...')
		const prNumber = getInput('pr_number')
		if (!prNumber) {
			throw new Error('Missing OSS PR number')
		}

		debug('Getting source commit from input...')
		const sourceSha = getInput('source_sha')
		if (!sourceSha) {
			throw new Error('Missing OSS source SHA')
		}

		debug('Getting branch ref from grafana enterprise...')
		try {
			let branch = await getBranch(octokit, sourceBranch)
			if (branch) {
				// Create the branch from the ref found in grafana-enterprise.
				await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha)
				return
			}
		} catch (err) {
			console.log('error fetching branch with same name in Enterprise', err)
		}

		debug("Branch in grafana enterprise doesn't exist, getting branch from 'target_branch' or 'main'...")
		// If the source branch was not found on Enterprise, then attempt to use the targetBranch (likely something like v9.2.x).
		// If the targetBranch was not found, then use `main`. If `main` wasn't found, then we have a problem.

		const targetBranch = getInput('target_branch') || 'main'
		try {
			const branch = await getBranch(octokit, targetBranch)
			if (branch) {
				// Create the branch from the ref found in grafana-enterprise.
				await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha)
				return
			}
		} catch (err) {
			console.log(`error fetching ${targetBranch}:`, err)
		}

		try {
			const branch = await getBranch(octokit, 'main')
			if (branch) {
				// Create the branch from the ref found in grafana-enterprise.
				await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha)
				return
			}
		} catch (err) {
			console.log('error fetching main:', err)
		}

		throw new Error('Failed to create upstream ref; no branch was found. Not even main.')
	}

	async onTriggered(octokit: OctoKit) {
		try {
			await this.createRef(octokit)
		} catch (err) {
			if (err instanceof Error) {
				setFailed(err)
			}
		}
	}
}

async function getBranch(octokit: OctoKit, branch: string): Promise<Octokit.ReposGetBranchResponse | null> {
	let res: Octokit.Response<Octokit.ReposGetBranchResponse>
	try {
		res = await octokit.octokit.repos.getBranch({
			branch: branch,
			owner: 'grafana',
			repo: 'grafana-enterprise',
		})

		return res.data
	} catch (err) {
		console.log('Could not get branch from upstream:', err)
		throw err
	}
}

async function createOrUpdateRef(
	octokit: OctoKit,
	prNumber: string,
	branch: string,
	sha: string,
	sourceSha: string,
) {
	const ref = `refs/heads/prc-${prNumber}-${sourceSha}/${branch}`
	debug(`Creating ref in grafana-enterprise: '${ref}'`)

	try {
		await octokit.octokit.git.createRef({
			owner: 'grafana',
			repo: 'grafana-enterprise',
			ref: ref,
			sha: sha,
		})
	} catch (err) {
		if (err instanceof RequestError && err.message === 'Reference already exists') {
			await octokit.octokit.git.updateRef({
				owner: 'grafana',
				repo: 'grafana-enterprise',
				ref: ref,
				sha: sha,
				force: true,
			})
		} else {
			throw err
		}
	}
}

new EnterpriseCheck().run() // eslint-disable-line
