/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface GitHub {
	query(query: Query): AsyncIterableIterator<GitHubIssue[]>

	hasWriteAccess(user: User): Promise<boolean>

	repoHasLabel(label: string): Promise<boolean>
	createLabel(label: string, color: string, description: string): Promise<void>
	deleteLabel(label: string): Promise<void>

	readConfig(path: string): Promise<any>

	dispatch(title: string): Promise<void>

	createIssue(owner: string, repo: string, title: string, body: string): Promise<void>

	releaseContainsCommit(release: string, commit: string): Promise<'yes' | 'no' | 'unknown'>

	getMilestone(number: number): Promise<Milestone>

	isUserMemberOfOrganization(org: string, username: string): Promise<boolean>

	getProject(projectId: number, org?: string, columnName?: string): Promise<ProjectAndColumnIds | undefined>

	addIssueToProject(project: number, issue: Issue, org?: string, columnName?: string): Promise<void>

	removeIssueFromProject(project: number, issue: Issue, org?: string): Promise<void>

	createStatus(
		sha: string,
		context: string,
		state: 'error' | 'failure' | 'pending' | 'success',
		description?: string,
		targetUrl?: string,
	): Promise<void>
}

export interface GitHubIssue extends GitHub {
	getIssue(): Promise<Issue>

	postComment(body: string): Promise<void>
	deleteComment(id: number): Promise<void>
	getComments(last?: boolean): AsyncIterableIterator<Comment[]>

	closeIssue(): Promise<void>
	lockIssue(): Promise<void>

	setMilestone(milestoneId: number): Promise<void>

	addLabel(label: string): Promise<void>
	removeLabel(label: string): Promise<void>

	addAssignee(assignee: string): Promise<void>
	removeAssignee(assignee: string): Promise<void>

	getClosingInfo(): Promise<{ hash: string | undefined; timestamp: number } | undefined>

	getPullRequest(): Promise<PullRequest>
	listPullRequestFilenames(): Promise<string[]>
}

type SortVar =
	| 'comments'
	| 'reactions'
	| 'reactions-+1'
	| 'reactions--1'
	| 'reactions-smile'
	| 'reactions-thinking_face'
	| 'reactions-heart'
	| 'reactions-tada'
	| 'interactions'
	| 'created'
	| 'updated'
type SortOrder = 'asc' | 'desc'
export type Reactions = {
	'+1': number
	'-1': number
	laugh: number
	hooray: number
	confused: number
	heart: number
	rocket: number
	eyes: number
}

export interface User {
	name: string
	isGitHubApp?: boolean
}

export interface Comment {
	author: User
	body: string
	id: number
	timestamp: number
}

export interface Issue {
	author: User
	body: string
	title: string
	labels: string[]
	open: boolean
	locked: boolean
	number: number
	numComments: number
	reactions: Reactions
	milestoneId: number | null
	assignee?: string
	createdAt: number
	updatedAt: number
	closedAt?: number
	isPullRequest?: boolean
	nodeId: string
}

export interface PullRequest {
	number: number
	milestoneId: number | null
	headSHA: string
}

export interface Query {
	q: string
	sort?: SortVar
	order?: SortOrder
	repo?: string
}

export interface Milestone {
	closed_at: string | null
	number: number
	title: string
}

export enum projectType {
	Project,
	ProjectV2,
}

export interface ProjectAndColumnIds {
	columnNodeId?: string
	projectNodeId: string
	projectType: projectType
}
