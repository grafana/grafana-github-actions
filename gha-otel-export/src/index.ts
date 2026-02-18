import * as core from '@actions/core'
import { summary } from '@actions/core'
import * as github from '@actions/github'
import assert from 'assert'
import { runExporter } from './main.js'

async function writeSummary(traceId: string) {
	try {
		await summary
			.addHeading('Trace Information', 2)
			.addTable([[{ data: 'Trace ID', header: true }, { data: traceId }]])
			.write()
	} catch (error) {
		core.warning(`Failed to write summary: ${String(error)}`)
	}
}

async function run(): Promise<void> {
	const token = core.getInput('github-token', { required: true })
	assert(token, 'GitHub token is required')

	const traceArtifactGlob = core.getInput('trace-artifacts-glob', { required: false })

	const context = github.context
	assert(context.eventName === 'workflow_run', 'This action only supports workflow_run events')

	const payload = context.payload
	assert(payload.workflow_run, 'No workflow_run found in payload')

	const owner = context.repo.owner
	const repo = context.repo.repo
	const runId = payload.workflow_run.id
	const attempt = payload.workflow_run.run_attempt ?? 1
	const workflow = payload.workflow_run.name

	const traceId = await runExporter({
		token,
		owner,
		repo,
		workflow,
		runId,
		attempt,
		traceArtifactGlob,
	})
	core.setOutput('trace-id', traceId)
	await writeSummary(traceId)
}

run().catch((error) => {
	if (error instanceof Error) {
		core.setFailed(error.message)
	} else {
		core.setFailed('An unexpected error occurred')
	}
})
