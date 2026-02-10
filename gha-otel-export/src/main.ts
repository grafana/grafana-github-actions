import * as dotenv from 'dotenv'
import { createGithubClient, getRunData } from './github.js'
import { createTrace } from './traces.js'
import { initTracing, shutdownTracing, exportSpans } from './exporters.js'
import assert from 'assert'
import { execSync } from 'child_process'

dotenv.config()

function getGithubToken(): string {
	try {
		const token = execSync('gh auth token', { encoding: 'utf8' }).trim()
		return token
	} catch (error) {
		assert(process.env.GITHUB_TOKEN, 'GITHUB_TOKEN is not set')
		return process.env.GITHUB_TOKEN
	}
}

async function main() {
	const token = getGithubToken()
	assert(token, 'GITHUB_TOKEN is not set and gh CLI is not authenticated. Run: gh auth login')

	const repoInput = process.env.REPO
	assert(repoInput, 'REPO is not set')

	const [owner, repo] = repoInput.split('/')
	assert(owner, 'REPO owner is not set')
	assert(repo, 'REPO name is not set')

	const workflow = process.env.WORKFLOW_NAME
	assert(workflow, 'WORKFLOW_NAME is not set')

	let runIdString = process.env.RUN_ID
	assert(runIdString, 'RUN_ID is not set')

	const runId = parseInt(runIdString)
	assert(!isNaN(runId), 'RUN_ID is not a number')

	let attemptString = process.env.RUN_ATTEMPT
	assert(attemptString, 'RUN_ATTEMPT is not set')

	const attempt = parseInt(attemptString)
	assert(!isNaN(attempt), 'RUN_ATTEMPT is not a number')

	const traceFileGlob = process.env.TRACE_FILE_GLOB

	await runExporter({
		token,
		owner,
		repo,
		workflow,
		runId,
		attempt,
		traceFileGlob,
	})
}

export async function runExporter(config: {
	token: string
	owner: string
	repo: string
	workflow: string
	runId: number
	attempt: number
	traceFileGlob?: string
}): Promise<string> {
	await initTracing()
	const { token, owner, repo, workflow, runId, attempt, traceFileGlob = [] } = config

	try {
		const oktokit = createGithubClient(token)
		console.log(`Fetching ${workflow} jobs for ${owner}/${repo}`)

		console.log(`Processing workflow: ${workflow}`)
		console.log(`Run ID: ${runId}, Attempt: ${attempt}`)
		console.log(`Repository: ${owner}/${repo}`)

		const jobs = await getRunData(oktokit, {
			owner: owner,
			repo: repo,
			name: workflow,
			runId: runId,
			attempt: attempt,
		})

		const { traceId, spans } = createTrace(jobs)

		console.log(`Trace ID: ${traceId}`)
		console.log(`Exporting ${spans.length} spans...`)

		await exportSpans(spans)
		return traceId
	} catch (err: any) {
		console.error('Error:', err.message)
		throw err
	} finally {
		await shutdownTracing()
	}
}

main().catch(console.error)
