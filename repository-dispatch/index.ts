import { context } from '@actions/github'
import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { getInput } from '@actions/core'

class RepositoryDispatch extends Action {
	id = 'RepositoryDispatch'

	constructor() {
		const token = getInput('token')
		const eventType = getInput('event_type')
		if (!token && eventType === 'oss-pull-request') {
			console.log(
				"Token is empty, can't dispatch event. This is expected for PRs coming from forks, please check that the changes are compatible with Enterprise before merging this PR.",
			)
		}

		super()
	}

	async runAction(): Promise<void> {
		const repository = getInput('repository')
		if (!repository) {
			throw new Error('Missing repository')
		}

		const api = new OctoKit(this.getToken(), context.repo)

		const [owner, repo] = repository.split('/')

		await api.octokit.repos.createDispatchEvent({
			owner: owner,
			repo: repo,
			event_type: getInput('event_type'),
			client_payload: JSON.parse(getInput('client_payload')),
		})
	}
}

new RepositoryDispatch().run() // eslint-disable-line
