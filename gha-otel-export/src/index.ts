import * as core from "@actions/core"
import {summary} from "@actions/core"
import * as github from "@actions/github"
import {createGithubClient, getRunData} from "./github.js"
import {createTrace} from "./traces.js"
import {exportSpans, initTracing, shutdownTracing} from "./exporters.js"
import assert from "assert"

async function writeSummary(traceId: string) {
    try {
        await summary.addHeading("Trace Information", 2)
            .addTable([[{data: "Trace ID", header: true}, {data: traceId}]])
            .write()
    } catch (error) {
        core.warning(`Failed to write summary: ${String(error)}`)
    }
}

async function run(): Promise<void> {
    const token = core.getInput("github-token", {required: true})

    const context = github.context
    assert(context.eventName === "workflow_run", "This action only supports workflow_run events")

    const payload = context.payload
    assert(payload.workflow_run, "No workflow_run found in payload")

    const workflowRun = payload.workflow_run

    const owner = context.repo.owner
    const repo = context.repo.repo
    const runId = workflowRun.id
    const attempt = workflowRun.run_attempt ?? 1
    const workflowName = workflowRun.name

    core.info(`Processing workflow: ${workflowName}`)
    core.info(`Run ID: ${runId}, Attempt: ${attempt}`)
    core.info(`Repository: ${owner}/${repo}`)

    await initTracing()

    try {
        const octokit = createGithubClient(token)

        const jobs = await getRunData(octokit, {
            owner,
            repo,
            name: workflowName,
            runId,
            attempt,
        })

        const {traceId, spans} = createTrace(jobs)

        core.info(`Trace ID: ${traceId}`)
        core.info(`Exporting ${spans.length} spans...`)

        await exportSpans(spans)
        core.setOutput("trace-id", traceId)
        await writeSummary(traceId)
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message)
        } else {
            core.setFailed("An unexpected error occurred")
        }
    } finally {
        await shutdownTracing()
    }
}

run()
