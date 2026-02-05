import { WorkflowJobRun, WorkflowRun, WorkflowStep } from './types.js'
import { generateJobSpanID, generateParentSpanID, generateStepSpanID, generateTraceID } from './trace-ids.js'
import { SpanContext } from '@opentelemetry/api'
import { ReadableSpan } from '@opentelemetry/sdk-trace-base'
import { createSpan, createSpanContext } from './span-utils.js'

export function createTrace(jobs: { workflow: WorkflowRun; workflowJobs: WorkflowJobRun[] }): {
	traceId: string
	spans: ReadableSpan[]
} {
	const { workflow, workflowJobs } = jobs
	const spans: ReadableSpan[] = []

	const traceId = generateTraceID(workflow.repository, String(workflow.id), String(workflow.runAttempt))

	const rootSpanId = generateParentSpanID(
		workflow.repository,
		String(workflow.id),
		String(workflow.runAttempt),
	)

	// Create the root workflow span (no parent)
	const rootSpan = createWorkflowSpan(workflow, traceId, rootSpanId)
	console.log(`Created root span: [${rootSpan.name}] with ID: ${rootSpanId}`)
	spans.push(rootSpan)

	const rootSpanContext = createSpanContext(traceId, rootSpanId)

	// Create job spans with workflow as parent
	for (const job of workflowJobs) {
		const jobSpanId = generateJobSpanID(
			workflow.repository,
			String(workflow.id),
			String(workflow.runAttempt),
			job.name,
		)

		const jobSpan = createJobSpan(job, traceId, jobSpanId, rootSpanContext)
		console.log(`  Created job span: [${jobSpan.name}] with ID: ${jobSpanId}`)
		spans.push(jobSpan)

		const jobSpanContext = createSpanContext(traceId, jobSpanId)

		// Create step spans with job as parent
		for (const step of job.steps) {
			const stepSpanId = generateStepSpanID(
				workflow.repository,
				String(workflow.id),
				String(workflow.runAttempt),
				job.name,
				step.name,
			)

			const stepSpan = createStepSpan(step, traceId, stepSpanId, jobSpanContext)
			console.log(`   • Created step span: [${stepSpan.name}] with ID: ${stepSpanId}`)
			spans.push(stepSpan)
		}
	}

	return { traceId, spans }
}

function createWorkflowSpan(workflow: WorkflowRun, traceId: string, spanId: string): ReadableSpan {
	return createSpan(
		workflow.name,
		traceId,
		spanId,
		workflow.createdAt,
		workflow.completedAt,
		workflow.conclusion,
		{
			workflow_run_id: workflow.id,
			run_attempt: workflow.runAttempt,
			workflow_name: workflow.name,
			repository: workflow.repository,
			url: workflow.htmlUrl,
			conclusion: workflow.conclusion,
		},
	)
}

function createJobSpan(
	job: WorkflowJobRun,
	traceId: string,
	spanId: string,
	parentSpanContext: SpanContext,
): ReadableSpan {
	return createSpan(
		job.name,
		traceId,
		spanId,
		job.startedAt,
		job.completedAt,
		job.conclusion,
		{
			job_id: job.id,
			job_name: job.name,
			run_id: job.runId,
			conclusion: job.conclusion,
			runner_name: job.runnerName ?? undefined,
			runner_group_name: job.runnerGroupName ?? undefined,
			workflow_name: job.workflowName,
		},
		parentSpanContext,
	)
}

function createStepSpan(
	step: WorkflowStep,
	traceId: string,
	spanId: string,
	parentSpanContext: SpanContext,
): ReadableSpan {
	return createSpan(
		step.name,
		traceId,
		spanId,
		step.startedAt,
		step.completedAt,
		step.conclusion,
		{
			step_name: step.name,
			conclusion: step.conclusion,
		},
		parentSpanContext,
	)
}
