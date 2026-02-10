import {
	generateJobSpanID,
	generateParentSpanID,
	generateStepSpanID,
	generateStepSpanID_Number,
	generateTraceID,
} from './trace-ids.js'

const repo = 'grafana/grafana'
const runId = '20137834310'
const runAttempt = '1'
const jobName = 'build'
// const jobNumber = "57796136451"
const stepName = 'Build Grafana'
const stepNumber = '8'

describe('otel ID generation', () => {
	it('GenerateTraceID', () => {
		const expected = '29f022cfd2ef0bec231e3facb2e5e888'
		const actual = generateTraceID(repo, runId, runAttempt)

		expect(actual).toBe(expected)
	})

	it('GenerateParentSpanID', () => {
		const expected = '35dc80e3696a695f'
		const actual = generateParentSpanID(repo, runId, runAttempt)

		expect(actual).toBe(expected)
	})

	it('GenerateJobSpanID', () => {
		const expected = '38d13486123da355'
		const actual = generateJobSpanID(repo, runId, runAttempt, jobName)

		expect(actual).toBe(expected)
	})

	it('GenerateStepSpanID (by name)', () => {
		const expected = '52b5804425ed1c83'
		const actual = generateStepSpanID(repo, runId, runAttempt, jobName, stepName)

		expect(actual).toBe(expected)
	})

	it('GenerateStepSpanID (by number)', () => {
		const expected = '5ac3072b544fdedc'
		const actual = generateStepSpanID_Number(repo, runId, runAttempt, jobName, stepNumber)

		expect(actual).toBe(expected)
	})

	it('Deterministic output', () => {
		const trace1 = generateTraceID(repo, runId, runAttempt)
		const trace2 = generateTraceID(repo, runId, runAttempt)
		expect(trace1).toBe(trace2)

		const job1 = generateJobSpanID(repo, runId, runAttempt, jobName)
		const job2 = generateJobSpanID(repo, runId, runAttempt, jobName)
		expect(job1).toBe(job2)

		const step1 = generateStepSpanID(repo, runId, runAttempt, jobName, stepName)
		const step2 = generateStepSpanID(repo, runId, runAttempt, jobName, stepName)
		expect(step1).toBe(step2)
	})
})
