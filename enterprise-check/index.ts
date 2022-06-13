import { Action } from '../common/Action'
import { Octokit } from '@octokit/rest'
import { OctoKit } from '../api/octokit'
import { getInput } from '@actions/core'

class EnterpriseCheck extends Action {
	id = 'EnterpriseCheck'

	async onTriggered(octokit: OctoKit) {
		const sourceBranch = getInput('source_branch')
		if (!sourceBranch) {
			throw new Error('Missing source branch')
		}

		const prNumber = getInput('pr_number')
		if (!prNumber) {
			throw new Error('Missing OSS PR number')
		}

		let branch = await getBranch(octokit, sourceBranch)
		if (!branch) {
			const targetBranch = getInput('target_branch') || 'main'

			branch = await getBranch(octokit, targetBranch)
			if (!branch) {
				branch = await getBranch(octokit, 'main')
				if (!branch) {
					throw new Error('error retrieving main branch')
				}
			}

			const res = await octokit.octokit.git.createRef({
				owner: 'grafana',
				repo: 'grafana-enterprise',
				ref: `refs/heads/pr-check-${prNumber}/${sourceBranch}`,
				sha: branch.commit.sha,
			})
			
			// Branch already exists - need to update the branch to trigger a new build
			if (res.status === 422) {
				await octokit.octokit.git.updateRef({
					owner: 'grafana',
					repo: 'grafana-enterprise',
					ref: `refs/heads/pr-check-${prNumber}/${sourceBranch}`,
					sha: branch.commit.sha,
					force: true,
				})
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
		console.log('err: ', err)
	}

	return null
}

new EnterpriseCheck().run() // eslint-disable-line
