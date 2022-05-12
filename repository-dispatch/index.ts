import { Action } from '../common/Action'
import { OctoKit } from '../api/octokit'
import { getInput } from '@actions/core'

class RepositoryDispatch extends Action {
	id = 'RepositoryDispatch'

	async onTriggered(octokit: OctoKit) {
		const repository = getInput('repository')
		if (!repository) {
			throw new Error('Missing repository')
		}

		const [owner, repo] = repository.split('/')

        console.log('creating dispatch event', owner, repo)
		const resp = await octokit.octokit.repos.createDispatchEvent({
			owner: owner,
			repo: repo,
			event_type: getInput('event_type'),
			client_payload: JSON.parse(getInput('client_payload')),
		})
        console.log(resp.status)
	}
}

new RepositoryDispatch().run() // eslint-disable-line
