import * as dotenv from 'dotenv'
import { createGithubClient, getRunData, downloadAndParseArtifacts } from './github.js'
import { createTrace } from './github_actions_traces.js'
import { parseToolexecTrace } from './trace_file_traces.js'
import { initTracing, shutdownTracing, exportSpans } from './exporters.js'
import assert from 'assert'

dotenv.config()

async function main() {
	const token = process.env.GITHUB_TOKEN
	assert(token, 'GITHUB_TOKEN is not set')

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

	const traceArtifactGlob = process.env.TRACE_ARTIFACTS_GLOB

	await runExporter({
		token,
		owner,
		repo,
		workflow,
		runId,
		attempt,
		traceArtifactGlob,
	})
}

export async function runExporter(config: {
	token: string
	owner: string
	repo: string
	workflow: string
	runId: number
	attempt: number
	traceArtifactGlob?: string
}): Promise<string> {
	await initTracing()

	try {
		const traceId = await traces(config)
		await processTookexecTraces(config)
		return traceId
	} catch (err: any) {
		console.error('Error:', err.message)
		throw err
	} finally {
		await shutdownTracing()
	}
}

async function traces(config: {
	token: string
	owner: string
	repo: string
	workflow: string
	runId: number
	attempt: number
}): Promise<string> {
	const { token, owner, repo, workflow, runId, attempt } = config

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
}

async function processTookexecTraces(config: {
	token: string
	owner: string
	repo: string
	workflow: string
	runId: number
	attempt: number
	traceArtifactGlob?: string
}): Promise<number> {
	const { token, owner, repo, workflow, runId, attempt, traceArtifactGlob } = config

	if (!traceArtifactGlob) {
		console.log('No trace artifact glob provided, skipping.')
		return 0
	}

	const oktokit = createGithubClient(token)
	const jobRequest = {
		owner: owner,
		repo: repo,
		name: workflow,
		runId: runId,
		attempt: attempt,
	}

	console.log('Fetching artifacts...')
	const parsedSpans = await downloadAndParseArtifacts(oktokit, jobRequest, traceArtifactGlob)
	console.log(`Artifacts contain ${parsedSpans.length} spans in total`)
	console.log(`Processing spans... ${parsedSpans.map((artifact) => artifact.name).join(', ')}`)
	const spans = parsedSpans.map(parseToolexecTrace)

	await exportSpans(spans)
	return spans.length
}

main().catch(console.error)
