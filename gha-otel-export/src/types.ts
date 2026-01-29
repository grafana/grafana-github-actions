export type WorkflowStep = {
	readonly name: string
	readonly conclusion: string
	readonly startedAt: Date
	readonly completedAt: Date
}

export type WorkflowJobRun = {
	readonly id: number
	readonly name: string
	readonly startedAt: Date
	readonly completedAt: Date
	readonly runId: number
	readonly conclusion: string
	readonly runnerName: string | null
	readonly runnerGroupName: string | null
	readonly workflowName: string
	readonly steps: WorkflowStep[]
}

export type WorkflowRun = {
	readonly id: number
	readonly name: string
	readonly conclusion: string
	readonly createdAt: Date
	readonly completedAt: Date
	readonly runAttempt: number
	readonly htmlUrl: string
	readonly repository: string
}
