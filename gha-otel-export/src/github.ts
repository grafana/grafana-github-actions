import { Octokit } from '@octokit/rest'
import { retryAsync } from 'ts-retry'
import { Endpoints } from '@octokit/types'
import assert from 'assert'
import { JobRequest, WorkflowRun, WorkflowJobRun, WorkflowStep } from './types.js'
import AdmZip from 'adm-zip'
import { minimatch } from 'minimatch'
import { brotliDecompressSync } from 'zlib'
import { decompress as zstdDecompress } from 'fzstd'
export type WorkflowResponse =
	Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}']['response']['data']
export type WorkflowJobsResponse =
	Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/jobs']['response']['data']['jobs']
export type ArtifactResponse =
	Endpoints['GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts']['response']['data']['artifacts'][number]
export type WorkflowJobResponse = WorkflowJobsResponse[number]
export type WorkflowStepResponse = NonNullable<WorkflowJobResponse['steps']>[number]

const ARTIFACT_MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const MAX_DISTINCT_SPANS_PER_FILE = 100

export const createGithubClient = (token: string): Octokit => {
	return new Octokit({
		baseUrl: 'https://api.github.com',
		auth: token,
	})
}

export async function getRunData(
	octokit: Octokit,
	job: JobRequest,
): Promise<{
	workflow: WorkflowRun
	workflowJobs: WorkflowJobRun[]
}> {
	try {
		return await retryAsync(async () => {
			console.log(`Fetching workflow ${job.name} for attempt ${job.attempt}`)
			const workflowResponse = await fetchWorkflow(octokit, job)

			console.log(`Fetching jobs for workflow ${job.name} for attempt ${job.attempt}`)
			const jobsResponse = await fetchWorkflowJobs(octokit, job)

			console.assert(
				jobsResponse.length > 0,
				`Workflow run attempt ${job.attempt} has no completed jobs`,
			)
			const workflow = convertWorkflow(workflowResponse, jobsResponse)

			console.log(`Converting jobs for workflow ${job.name} for attempt ${job.attempt}`)
			const jobs = jobsResponse.map(convertWorkflowJobs)
			console.assert(jobs.length > 0, `Workflow run attempt ${job.attempt} has no completed jobs`)

			return {
				workflow: workflow,
				workflowJobs: jobs,
			}
		})
	} catch (e) {
		return Promise.reject(e)
	}
}

async function fetchWorkflow(octokit: Octokit, job: JobRequest): Promise<WorkflowResponse> {
	const result = await octokit.rest.actions.getWorkflowRunAttempt({
		owner: job.owner,
		repo: job.repo,
		run_id: job.runId,
		attempt_number: job.attempt,
	})

	return result.data
}

async function fetchWorkflowJobs(octokit: Octokit, job: JobRequest): Promise<WorkflowJobsResponse> {
	const result = await octokit.rest.actions.listJobsForWorkflowRunAttempt({
		owner: job.owner,
		repo: job.repo,
		run_id: job.runId,
		attempt_number: job.attempt,
		per_page: 100,
	})
	return result.data.jobs
}

function convertWorkflow(workflow: WorkflowResponse, jobs: WorkflowJobsResponse): WorkflowRun {
	assert(workflow.name, `Workflow name is not set`)
	assert(workflow.conclusion, `Workflow conclusion is not set for ${workflow.name}`)
	assert(workflow.created_at, `Workflow created_at is not set for ${workflow.name}`)
	assert(workflow.run_attempt, `Workflow run_attempt is not set for ${workflow.name}`)

	const completedAt = jobs.reduce((max, job) => {
		return Math.max(max, new Date(job.completed_at ?? 0).getTime())
	}, 0)

	assert(completedAt > 0, `Workflow completed_at is not set for ${workflow.name}`)

	return {
		id: workflow.id,
		name: workflow.name,
		repository: workflow.repository.full_name,
		runAttempt: workflow.run_attempt,
		createdAt: new Date(workflow.created_at),
		completedAt: new Date(completedAt),
		htmlUrl: workflow.html_url,
		conclusion: workflow.conclusion,
	}
}

function convertWorkflowJobs(job: WorkflowJobResponse): WorkflowJobRun {
	assert(job.status === 'completed', `Workflow run is not completed yet for job ${job.name}`)
	assert(job.conclusion, `Job conclusion is not set for ${job.name}`)
	assert(job.completed_at, `Job completed_at is not set for ${job.name}`)
	assert(job.workflow_name, `Workflow name is not set for ${job.name}`)

	return {
		id: job.id,
		name: job.name,
		conclusion: job.conclusion,
		startedAt: new Date(job.started_at),
		completedAt: new Date(job.completed_at),
		workflowName: job.workflow_name,
		runId: job.run_id,
		steps: job.steps?.map(convertSteps) || [],
		runnerName: job.runner_name,
		runnerGroupName: job.runner_group_name,
	}
}

function convertSteps(step: WorkflowStepResponse): WorkflowStep {
	assert(step.conclusion, `Step conclusion is not set for ${step.name}`)
	assert(step.started_at, `Step started_at is not set for ${step.name}`)
	assert(step.completed_at, `Step completed_at is not set for ${step.name}`)

	return {
		name: step.name,
		conclusion: step.conclusion,
		startedAt: new Date(step.started_at),
		completedAt: new Date(step.completed_at),
	}
}
export async function listArtifacts(octokit: Octokit, job: JobRequest): Promise<ArtifactResponse[]> {
	const result = await octokit.rest.actions.listWorkflowRunArtifacts({
		owner: job.owner,
		repo: job.repo,
		run_id: job.runId,
		per_page: 100,
	})
	return result.data.artifacts
}

export async function findArtifactsByPattern(
	octokit: Octokit,
	job: JobRequest,
	pattern: string,
): Promise<ArtifactResponse[]> {
	const artifacts = await listArtifacts(octokit, job)
	return artifacts.filter((artifact) => minimatch(artifact.name, pattern))
}

export async function downloadArtifactBuffer(
	octokit: Octokit,
	job: JobRequest,
	artifactId: number,
): Promise<Buffer> {
	const result = await octokit.rest.actions.downloadArtifact({
		owner: job.owner,
		repo: job.repo,
		artifact_id: artifactId,
		archive_format: 'zip',
	})

	return Buffer.from(result.data as ArrayBuffer)
}

function processZipEntry(entry: AdmZip.IZipEntry): any[] {
	try {
		const entrySize = entry.header.size
		if (entrySize > ARTIFACT_MAX_SIZE_BYTES) {
			console.error(
				`Entry ${entry.entryName} size ${entrySize} bytes exceeds limit ${ARTIFACT_MAX_SIZE_BYTES} bytes, skipping`,
			)
			return []
		}

		let data = entry.getData()

		const entryName = entry.entryName.toLowerCase()
		if (entryName.endsWith('.br') || entryName.endsWith('.brotli')) {
			console.log(`Decompressing brotli file: ${entry.entryName}`)
			data = brotliDecompressSync(data)
		} else if (entryName.endsWith('.zst') || entryName.endsWith('.zstd')) {
			console.log(`Decompressing zstandard file: ${entry.entryName}`)
			data = Buffer.from(zstdDecompress(data))
		}

		const content = data.toString('utf8')
		const lines = content.split('\n').filter((line: string) => line.trim())

		const spans: any[] = []
		for (const line of lines) {
			try {
				const span = JSON.parse(line)

				if (!span.Attributes) {
					span.Attributes = []
				}

				span.Attributes.push({
					Key: 'ci.artifact.name',
					Value: { Type: 'STRING', Value: entry.entryName },
				})

				const startTime = new Date(span.StartTime).getTime()
				const endTime = new Date(span.EndTime).getTime()
				span.duration = (endTime - startTime) * 1000000 // Convert ms to ns

				spans.push(span)
			} catch (error) {
				console.warn(`Failed to parse JSONL line in ${entry.entryName}: ${line.substring(0, 100)}...`)
			}
		}

		spans.sort((a, b) => b.duration - a.duration)

		console.log(
			`  Parsed ${spans.length} spans from ${entry.entryName}, taking top ${Math.min(spans.length, MAX_DISTINCT_SPANS_PER_FILE)}`,
		)

		const results = spans.slice(0, MAX_DISTINCT_SPANS_PER_FILE)

		if (spans.length > MAX_DISTINCT_SPANS_PER_FILE) {
			const remainingSpans = spans.slice(MAX_DISTINCT_SPANS_PER_FILE)
			const totalDuration = remainingSpans.reduce((sum, span) => sum + span.duration, 0)

			const aggregateSpan = {
				...remainingSpans[0],
				Name: `${entry.entryName}_aggregates`,
				StartTime: remainingSpans[0].StartTime,
				EndTime: new Date(
					new Date(remainingSpans[0].StartTime).getTime() + totalDuration / 1000000,
				).toISOString(),
				duration: totalDuration,
			}

			aggregateSpan.Attributes = [
				{
					Key: 'total_items',
					Value: { Type: 'INT', Value: remainingSpans.length },
				},
				{
					Key: 'ci.artifact.name',
					Value: { Type: 'STRING', Value: entry.entryName },
				},
			]

			results.push(aggregateSpan)
		}

		return results
	} catch (error) {
		console.error(`  Failed to process entry ${entry.entryName}: ${error}`)
		return []
	}
}

export function extractJsonlFromZip(zipBuffer: Buffer, artifactName: string): Map<string, any[]> {
	const zip = new AdmZip(zipBuffer)
	const results = new Map<string, any[]>()

	zip.getEntries()
		.filter((entry) => !entry.isDirectory)
		.forEach((entry) => {
			const spans = processZipEntry(entry)
			results.set(entry.entryName, spans)
		})

	return results
}

export async function downloadAndParseArtifacts(
	octokit: Octokit,
	job: JobRequest,
	pattern: string,
): Promise<any[]> {
	const artifacts = await findArtifactsByPattern(octokit, job, pattern)

	if (artifacts.length === 0) {
		console.info(`No artifacts found matching pattern: ${pattern}`)
		return []
	}

	console.log(`Found ${artifacts.length} artifact(s) matching pattern "${pattern}"`)

	const spans: any[] = []

	for (const artifact of artifacts) {
		assert(
			artifact.size_in_bytes <= ARTIFACT_MAX_SIZE_BYTES,
			`Artifact size exceeds limit: ${artifact.size_in_bytes} bytes`,
		)

		console.log(`Downloading and parsing artifact: ${artifact.name} (${artifact.size_in_bytes} bytes)`)

		const zipBuffer = await downloadArtifactBuffer(octokit, job, artifact.id)
		const entriesMap = extractJsonlFromZip(zipBuffer, artifact.name)

		for (const [entryName, entrySpans] of entriesMap) {
			console.log(`  Extracted ${entrySpans.length} trace(s) from ${artifact.name} -> ${entryName}`)
			spans.push(...entrySpans)
		}
	}

	return spans
}
