import { createHash } from 'crypto'

/**
 * Equivalent to:
 * fmt.Sprintf("%s%s%st", repo, runID, runAttempt)
 * sha256.Sum256
 * hex.EncodeToString(hash)[:32]
 */
export function generateTraceID(repo: string, runID: string, runAttempt: string): string {
	const input = `${repo}${runID}${runAttempt}t`
	const hash = createHash('sha256').update(input).digest('hex')
	return hash.slice(0, 32)
}

/**
 * Equivalent to:
 * fmt.Sprintf("%s%s%ss", repo, runID, runAttempt)
 * hex.EncodeToString(hash)[16:32]
 */
export function generateParentSpanID(repo: string, runID: string, runAttempt: string): string {
	const input = `${repo}${runID}${runAttempt}s`
	const hash = createHash('sha256').update(input).digest('hex')
	return hash.slice(16, 32)
}

/**
 * Equivalent to:
 * fmt.Sprintf("%s%s%s%s", repo, runID, runAttempt, jobName)
 * hex.EncodeToString(hash)[16:32]
 */
export function generateJobSpanID(repo: string, runID: string, runAttempt: string, jobName: string): string {
	const input = `${repo}${runID}${runAttempt}${jobName}`
	const hash = createHash('sha256').update(input).digest('hex')
	return hash.slice(16, 32)
}

/**
 * Equivalent to:
 * fmt.Sprintf("%s%s%s%s%s", repo, runID, runAttempt, jobName, stepName)
 * hex.EncodeToString(hash)[16:32]
 */
export function generateStepSpanID(
	repo: string,
	runID: string,
	runAttempt: string,
	jobName: string,
	stepName: string,
): string {
	const input = `${repo}${runID}${runAttempt}${jobName}${stepName}`
	const hash = createHash('sha256').update(input).digest('hex')
	return hash.slice(16, 32)
}

/**
 * Equivalent to:
 * fmt.Sprintf("%s%s%s%s%s", repo, runID, runAttempt, jobName, stepNumber)
 * hex.EncodeToString(hash)[16:32]
 */
export function generateStepSpanID_Number(
	repo: string,
	runID: string,
	runAttempt: string,
	jobName: string,
	stepNumber: string,
): string {
	const input = `${repo}${runID}${runAttempt}${jobName}${stepNumber}`
	const hash = createHash('sha256').update(input).digest('hex')
	return hash.slice(16, 32)
}
