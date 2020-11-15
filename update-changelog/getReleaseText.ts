import { OctoKit } from '../api/octokit'

export async function getReleaseText(octokit: OctoKit, milestone: number): Promise<string> {
	const res = ''

	for await (const page of octokit.query({ q: `is:closed milestone:7.3.3 label:"add to changelog"` })) {
		console.log('page', page)
		break
	}

	return 'asd'
}
