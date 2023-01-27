/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import {
	Comment,
	GitHub,
	GitHubIssue,
	Issue,
	Milestone,
	ProjectAndColumnIds,
	projectType,
	PullRequest,
	Query,
	User,
} from './api'

type TestbedConfig = {
	globalLabels: string[]
	configs: Record<string, any>
	writers: string[]
	milestone?: Milestone
	releasedCommits: string[]
	queryRunner: (query: Query) => AsyncIterableIterator<(TestbedIssueConstructorArgs | TestbedIssue)[]>
	userMemberOfOrganization: boolean
	projectNodeId?: string
}

export type TestbedConstructorArgs = Partial<TestbedConfig>

export class Testbed implements GitHub {
	public config: TestbedConfig

	constructor(config?: TestbedConstructorArgs) {
		this.config = {
			globalLabels: config?.globalLabels ?? [],
			configs: config?.configs ?? {},
			writers: config?.writers ?? [],
			milestone: config?.milestone,
			releasedCommits: config?.releasedCommits ?? [],
			queryRunner:
				config?.queryRunner ??
				async function* () {
					yield []
				},
			userMemberOfOrganization: config?.userMemberOfOrganization ?? false,
			projectNodeId: config?.projectNodeId ?? 'TESTPROJECTID',
		}
	}

	async *query(query: Query): AsyncIterableIterator<GitHubIssue[]> {
		for await (const page of this.config.queryRunner(query)) {
			yield page.map((issue) =>
				issue instanceof TestbedIssue ? issue : new TestbedIssue(this.config, issue),
			)
		}
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async createIssue(_owner: string, _repo: string, _title: string, _body: string): Promise<void> {
		// pass...
	}

	async readConfig(path: string): Promise<any> {
		return JSON.parse(JSON.stringify(this.config.configs[path]))
	}

	async hasWriteAccess(user: User): Promise<boolean> {
		return this.config.writers.includes(user.name)
	}

	async repoHasLabel(label: string): Promise<boolean> {
		return this.config.globalLabels.includes(label)
	}
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async createLabel(label: string, _color: string, _description: string): Promise<void> {
		this.config.globalLabels.push(label)
	}

	async deleteLabel(labelToDelete: string): Promise<void> {
		this.config.globalLabels = this.config.globalLabels.filter((label) => label !== labelToDelete)
	}

	async releaseContainsCommit(_release: string, commit: string): Promise<'yes' | 'no' | 'unknown'> {
		return this.config.releasedCommits.includes(commit) ? 'yes' : 'no'
	}

	async dispatch(title: string): Promise<void> {
		console.log('dispatching for', title)
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async getMilestone(_number: number): Promise<Milestone> {
		return this.config.milestone!
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async isUserMemberOfOrganization(org: string, username: string): Promise<boolean> {
		return this.config.userMemberOfOrganization
	}

	/* eslint-disable @typescript-eslint/no-unused-vars */
	async getProject(
		_projectId: number,
		_org?: string,
		_columnName?: string,
	): Promise<ProjectAndColumnIds | undefined> {
		return {
			projectNodeId: this.config.projectNodeId ?? 'TESTPROJECTID',
			projectType: projectType.ProjectV2,
		}
	}
	/* eslint-enable @typescript-eslint/no-unused-vars */

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async addIssueToProject(_project: number, _issue: Issue, org?: string): Promise<void> {
		// pass...
	}

	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	async removeIssueFromProject(_project: number, _issue: Issue, org?: string): Promise<void> {
		// pass...
	}

	/* eslint-disable */
	async createStatus(
		_sha: string,
		_context: string,
		_state: 'error' | 'failure' | 'pending' | 'success',
		_description?: string,
		_targetUrl?: string,
	): Promise<void> {
		return
	}
	/* eslint-enable */
}

type TestbedIssueConfig = {
	issue: Omit<Issue, 'labels'>
	comments: Comment[]
	labels: string[]
	closingCommit: { hash: string | undefined; timestamp: number } | undefined
	pullRequestFilenames: string[]
	pullRequest: PullRequest
}

export type TestbedIssueConstructorArgs = Partial<Omit<TestbedIssueConfig, 'issue'>> & {
	issue?: Partial<Omit<Issue, 'labels'>>
}

export class TestbedIssue extends Testbed implements GitHubIssue {
	public issueConfig: TestbedIssueConfig

	constructor(globalConfig?: TestbedConstructorArgs, issueConfig?: TestbedIssueConstructorArgs) {
		super(globalConfig)
		issueConfig = issueConfig ?? {}
		issueConfig.comments = issueConfig?.comments ?? []
		issueConfig.labels = issueConfig?.labels ?? []
		issueConfig.issue = {
			author: { name: 'JacksonKearl' },
			body: 'issue body',
			locked: false,
			numComments: issueConfig?.comments?.length || 0,
			number: 1,
			open: true,
			title: 'issue title',
			assignee: undefined,
			reactions: {
				'+1': 0,
				'-1': 0,
				confused: 0,
				eyes: 0,
				heart: 0,
				hooray: 0,
				laugh: 0,
				rocket: 0,
			},
			closedAt: undefined,
			createdAt: +new Date(),
			updatedAt: +new Date(),
			...issueConfig.issue,
		}
		;(issueConfig.pullRequestFilenames = issueConfig?.pullRequestFilenames ?? []),
			(this.issueConfig = issueConfig as TestbedIssueConfig)
	}

	async addAssignee(assignee: string): Promise<void> {
		this.issueConfig.issue.assignee = assignee
	}

	async removeAssignee(): Promise<void> {
		this.issueConfig.issue.assignee = undefined
	}

	async setMilestone(milestoneId: number): Promise<void> {
		this.issueConfig.issue.milestoneId = milestoneId
	}

	async getIssue(): Promise<Issue> {
		const labels = [...this.issueConfig.labels]
		return { ...this.issueConfig.issue, labels }
	}

	async getPullRequest(): Promise<PullRequest> {
		return { ...this.issueConfig.pullRequest }
	}

	async postComment(body: string, author?: string): Promise<void> {
		this.issueConfig.comments.push({
			author: { name: author ?? 'bot' },
			body,
			id: Math.random(),
			timestamp: +new Date(),
		})
	}

	async deleteComment(id: number): Promise<void> {
		this.issueConfig.comments = this.issueConfig.comments.filter((comment) => comment.id !== id)
	}

	async *getComments(last?: boolean): AsyncIterableIterator<Comment[]> {
		yield last
			? [this.issueConfig.comments[this.issueConfig.comments.length - 1]]
			: this.issueConfig.comments
	}

	async addLabel(label: string): Promise<void> {
		this.issueConfig.labels.push(label)
	}

	async removeLabel(labelToDelete: string): Promise<void> {
		this.issueConfig.labels = this.issueConfig.labels.filter((label) => label !== labelToDelete)
	}

	async closeIssue(): Promise<void> {
		this.issueConfig.issue.open = false
	}

	async lockIssue(): Promise<void> {
		this.issueConfig.issue.locked = true
	}

	async getClosingInfo(): Promise<{ hash: string | undefined; timestamp: number } | undefined> {
		return this.issueConfig.closingCommit
	}

	async listPullRequestFilenames(): Promise<string[]> {
		return this.issueConfig.pullRequestFilenames
	}
}
