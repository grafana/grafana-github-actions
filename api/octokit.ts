/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { debug } from '@actions/core'
import { GitHub as GitHubAPI } from '@actions/github'
import { RequestError } from '@octokit/request-error'
import { Octokit } from '@octokit/rest'
import { graphql } from '@octokit/graphql'
import { exec } from 'child_process'
import type { GraphQlQueryResponseData } from '@octokit/graphql'
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

let numRequests = 0
export const getNumRequests = () => numRequests

export class OctoKit implements GitHub {
	private _octokit: GitHubAPI
	private _octokitGraphQL: typeof graphql
	public get octokit(): GitHubAPI {
		numRequests++
		return this._octokit
	}
	public get octokitGraphQL() {
		return this._octokitGraphQL
	}
	// when in readonly mode, record labels just-created so at to not throw unneccesary errors
	protected mockLabels: Set<string> = new Set()

	constructor(
		protected token: string,
		protected params: { repo: string; owner: string },
		protected options: { readonly: boolean } = { readonly: false },
	) {
		console.debug('Constructor OctoKit init')

		this._octokit = new GitHubAPI(token)
		this._octokitGraphQL = graphql.defaults({
			headers: {
				authorization: `token ${token}`,
			},
		})
		console.debug('Constructor OctoKit end')
	}

	// TODO: just iterate over the issues in a page here instead of making caller do it
	async *query(query: Query): AsyncIterableIterator<GitHubIssue[]> {
		const q = query.q + ` repo:${this.params.owner}/${query.repo ?? this.params.repo}`
		console.log(`Querying for ${q}:`)

		const options = this.octokit.search.issuesAndPullRequests.endpoint.merge({
			...query,
			q,
			per_page: 100,
			headers: { Accept: 'application/vnd.github.squirrel-girl-preview+json' },
		})

		let pageNum = 0

		const timeout = async () => {
			if (pageNum < 2) {
				/* pass */
			} else if (pageNum < 4) {
				await new Promise((resolve) => setTimeout(resolve, 3000))
			} else {
				await new Promise((resolve) => setTimeout(resolve, 30000))
			}
		}

		for await (const pageResponse of this.octokit.paginate.iterator(options)) {
			await timeout()
			numRequests++
			const page: Array<Octokit.SearchIssuesAndPullRequestsResponseItemsItem> = pageResponse.data
			console.log(`Page ${++pageNum}: ${page.map(({ number }) => number).join(' ')}`)
			yield page.map(
				(issue) => new OctoKitIssue(this.token, this.params, this.octokitIssueToIssue(issue)),
			)
		}
	}

	public async getMilestone(number: number): Promise<Milestone> {
		const res = await this.octokit.issues.getMilestone({
			owner: this.params.owner,
			repo: this.params.repo,
			milestone_number: number,
		})

		return {
			closed_at: res.data.closed_at,
			title: res.data.title,
			number,
		}
	}

	async createIssue(owner: string, repo: string, title: string, body: string): Promise<void> {
		debug(`Creating issue \`${title}\` on ${owner}/${repo}`)
		if (!this.options.readonly) await this.octokit.issues.create({ owner, repo, title, body })
	}

	protected octokitIssueToIssue(
		issue: Octokit.IssuesGetResponse | Octokit.SearchIssuesAndPullRequestsResponseItemsItem,
	): Issue {
		return {
			author: { name: issue.user.login, isGitHubApp: issue.user.type === 'Bot' },
			body: issue.body,
			number: issue.number,
			title: issue.title,
			labels: (issue.labels as Octokit.IssuesGetLabelResponse[]).map((label) => label.name),
			open: issue.state === 'open',
			locked: (issue as any).locked,
			numComments: issue.comments,
			reactions: (issue as any).reactions,
			assignee: issue.assignee?.login ?? (issue as any).assignees?.[0]?.login,
			milestoneId: issue.milestone?.number ?? null,
			createdAt: +new Date(issue.created_at),
			updatedAt: +new Date(issue.updated_at),
			closedAt: issue.closed_at ? +new Date(issue.closed_at as unknown as string) : undefined,
			isPullRequest: !!issue.pull_request,
			nodeId: issue.node_id,
		}
	}

	protected octokitPullRequestToPullRequest(pr: Octokit.PullsGetResponse): PullRequest {
		return {
			number: pr.number,
			headSHA: pr.head.sha,
			milestoneId: pr.milestone?.number,
		}
	}

	private writeAccessCache: Record<string, boolean> = {}
	async hasWriteAccess(user: User): Promise<boolean> {
		if (user.name in this.writeAccessCache) {
			debug('Got permissions from cache for ' + user)
			return this.writeAccessCache[user.name]
		}
		debug('Fetching permissions for ' + user)
		const permissions = (
			await this.octokit.repos.getCollaboratorPermissionLevel({
				...this.params,
				username: user.name,
			})
		).data.permission
		return (this.writeAccessCache[user.name] = permissions === 'admin' || permissions === 'write')
	}

	async repoHasLabel(name: string): Promise<boolean> {
		try {
			await this.octokit.issues.getLabel({ ...this.params, name })
			return true
		} catch (err) {
			if (err instanceof RequestError && err.status === 404) {
				return this.options.readonly && this.mockLabels.has(name)
			}
			throw err
		}
	}

	async createLabel(name: string, color: string, description: string): Promise<void> {
		debug('Creating label ' + name)
		if (!this.options.readonly)
			await this.octokit.issues.createLabel({ ...this.params, color, description, name })
		else this.mockLabels.add(name)
	}

	async deleteLabel(name: string): Promise<void> {
		debug('Deleting label ' + name)
		try {
			if (!this.options.readonly) await this.octokit.issues.deleteLabel({ ...this.params, name })
		} catch (err) {
			if (err instanceof RequestError && err.status === 404) {
				return
			}
			throw err
		}
	}

	async readConfig(path: string): Promise<any> {
		debug('Reading config at ' + path)
		const repoPath = `.github/${path}.json`
		try {
			const data = (await this.octokit.repos.getContents({ ...this.params, path: repoPath })).data

			if ('type' in data && data.type === 'file') {
				if (data.encoding === 'base64' && data.content) {
					return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'))
				}
				throw Error(`Could not read contents "${data.content}" in encoding "${data.encoding}"`)
			}
			throw Error('Found directory at config path when expecting file' + JSON.stringify(data))
		} catch (e) {
			throw Error('Error with config file at ' + repoPath + ': ' + JSON.stringify(e))
		}
	}

	async releaseContainsCommit(release: string, commit: string): Promise<'yes' | 'no' | 'unknown'> {
		return new Promise((resolve, reject) =>
			exec(`git -C ./repo merge-base --is-ancestor ${commit} ${release}`, (err) => {
				if (!err || err.code === 1) {
					resolve(!err ? 'yes' : 'no')
				} else if (err.message.includes(`Not a valid commit name ${release}`)) {
					// release branch is forked. Probably in endgame. Not released.
					resolve('no')
				} else if (err.message.includes(`Not a valid commit name ${commit}`)) {
					// commit is probably in a different repo.
					resolve('unknown')
				} else {
					reject(err)
				}
			}),
		)
	}

	async dispatch(title: string): Promise<void> {
		debug('Dispatching ' + title)
		if (!this.options.readonly)
			await this.octokit.repos.createDispatchEvent({ ...this.params, event_type: title })
	}

	async getRepoInfo(): Promise<Octokit.Response<Octokit.ReposGetResponse>> {
		return await this.octokit.repos.get({ owner: this.params.owner, repo: this.params.repo })
	}

	private orgMembersCache: Record<string, Record<string, boolean>> = {}
	async isUserMemberOfOrganization(org: string, username: string): Promise<boolean> {
		if (org in this.orgMembersCache && username in this.orgMembersCache[org]) {
			debug('Got user  ' + username + ' is member of organization ' + org + ' from cache')
			return this.orgMembersCache[org][username]
		}

		if (!(org in this.orgMembersCache)) {
			this.orgMembersCache[org] = {}
		}

		debug('Checking if user ' + username + ' is member of organization ' + org)

		try {
			const resp = await this.octokit.orgs.checkMembership({ org, username })
			debug('isUserMemberOfOrganization response status ' + resp.status)
			// 204 is the response if requester is an organization member and user is a member
			this.orgMembersCache[org][username] = resp.status === 204
			return this.orgMembersCache[org][username]
		} catch (err) {
			debug('isUserMemberOfOrganization error response ' + err)
			if (err instanceof RequestError && err.status === 404) {
				this.orgMembersCache[org][username] = false
				return this.orgMembersCache[org][username]
			}
			throw err
		}
	}

	async getProject(
		projectId: number,
		org: string,
		columnName?: string,
	): Promise<ProjectAndColumnIds | undefined> {
		console.debug('Running getProject for project ' + projectId)

		try {
			const result = (await this._octokitGraphQL({
				query: `query getProjectNodeId($org: String!, $projectId: Int!) {
					organization(login: $org) {	
					  projectV2(number: $projectId) {
						id
					  }
					  project(number: $projectId) {
						id
						state
						columns(first: 100) {
						  edges {
							node {
							  id
							  name
							}
						  }
						}
					  }
					}
				  }
				`,
				projectId: Math.floor(projectId),
				org,
			})) as GraphQlQueryResponseData
			console.debug('getProject result ' + JSON.stringify(result))

			if (result.organization.projectV2 && result.organization.projectV2.id) {
				return {
					projectType: projectType.ProjectV2,
					projectNodeId: result.organization.projectV2.id,
				}
			} else if (result.organization.project && result.organization.project.id && columnName) {
				// try to find the right column
				for (const column of result.organization.project.columns.edges) {
					if (column.node.name === columnName) {
						return {
							projectType: projectType.Project,
							projectNodeId: result.organization.project.id,
							columnNodeId: column.node.id,
						}
					}
				}

				return undefined
			}
		} catch (error) {
			console.error('Could not get project node id ' + error)
		}
		return undefined
	}

	protected async addIssueToProjectOld(projectColumnId: string, issueNodeId: string) {
		console.log(
			'Running addIssueToProjectOld with: projectColumnId: ',
			projectColumnId,
			' issueNodeId: ',
			issueNodeId,
		)
		const mutation = `mutation addProjectCard($projectColumnId: ID!, $issueNodeId: ID!) {
			addProjectCard(input: {projectColumnId: $projectColumnId, contentId: $issueNodeId}) {
				cardEdge {
					node {
					  id
					}
				  }
			}
		  }`
		return await this._octokitGraphQL({
			query: mutation,
			projectColumnId,
			issueNodeId,
		})
	}

	protected async removeIssueFromProjectOld(projectNodeId: string, issueNodeId: string) {
		console.log(
			'Running removeIssueFromProjectOld with: projectNodeId: ',
			projectNodeId,
			' issueNodeId: ',
			issueNodeId,
		)
		const mutation = `mutation deleteProjectNextItem($projectNodeId: ID!, $issueNodeId: ID!) {
			deleteProjectNextItem(input: {projectId: $projectNodeId, itemId: $issueNodeId}) {
				deletedItemId
			}
		  }`
		return await this._octokitGraphQL({
			query: mutation,
			projectNodeId,
			issueNodeId,
		})
	}

	protected async addIssueToProjectV2(projectNodeId: string, issueNodeId: string) {
		console.log(
			'Running addIssueToProjectV2 with: projectNodeId: ',
			projectNodeId,
			' issueNodeId: ',
			issueNodeId,
		)

		const mutation = `mutation addIssueToProject($projectNodeId: ID!, $issueNodeId: ID!){
			addProjectV2ItemById(input: {projectId: $projectNodeId, contentId: $issueNodeId}) {
				item {
				  id
				}
			  }
		}`
		return await this._octokitGraphQL({
			query: mutation,
			projectNodeId,
			issueNodeId,
		})
	}

	protected async getItemIdFromIssueProjectV2(
		projectNodeId: string,
		issueNodeId: string,
	): Promise<string | undefined> {
		console.log(
			'Running getItemIdFromIssueProjectV2 with: projectNodeId: ',
			projectNodeId,
			' issueNodeId: ',
			issueNodeId,
		)

		const mutation = `query getIssueProjectV2NodeId($issueNodeId: ID!) {
			node(id: $issueNodeId) {
			  id
			  ... on Issue {
				id
				projectItems(first: 100) {
				  nodes {
					id
					project {
					  id
					}
				  }
				}
			  }
			}
		}`

		try {
			const results = (await this._octokitGraphQL({
				query: mutation,
				issueNodeId,
			})) as GraphQlQueryResponseData

			// finding the right issueProjectV2NodeId
			for (const issueProjectV2Node of results.node.projectItems.nodes) {
				if (
					issueProjectV2Node.project &&
					issueProjectV2Node.project.id &&
					issueProjectV2Node.project.id === projectNodeId
				) {
					return issueProjectV2Node.id
				}
			}
			throw new Error('Could not find the right project' + JSON.stringify(results))
		} catch (error) {
			console.error('getItemIdFromIssueProjectV2 failed: ' + error)
		}
		return undefined
	}

	protected async removeIssueFromProjectV2(projectNodeId: string, issueNodeId: string) {
		console.log(
			'Running removeIssueFromProjectV2 with: projectNodeId: ',
			projectNodeId,
			'issueNodeId: ',
			issueNodeId,
		)

		const mutation = `mutation removeIssueFromProject($projectNodeId: ID!, $issueNodeId: ID!){
			deleteProjectV2Item(
			  input: {
				projectId: $projectNodeId
				itemId: $issueNodeId
			  }
			) {
			  deletedItemId
			}
		  }`
		return await this._octokitGraphQL({
			query: mutation,
			projectNodeId,
			issueNodeId,
		})
	}

	async addIssueToProject(
		projectId: number,
		issue: Issue,
		org = 'grafana',
		columnName?: string,
	): Promise<void> {
		console.debug('Running addIssueToProject for: ' + projectId)
		try {
			const project = await this.getProject(projectId, org, columnName)

			if (!project) {
				console.log('Could not find project for project id: ' + projectId)
				return
			}
			if (project.projectType === projectType.ProjectV2) {
				await this.addIssueToProjectV2(project.projectNodeId, issue.nodeId)
			} else if (project.projectType === projectType.Project && project.columnNodeId) {
				await this.addIssueToProjectOld(project.columnNodeId, issue.nodeId)
			} else {
				console.error('Unknown project type or column name: ' + project)
			}
		} catch (error) {
			console.error('addIssueToProject failed: ' + error)
		}
	}

	async removeIssueFromProject(projectId: number, issue: Issue, org = 'grafana'): Promise<void> {
		console.debug('Running removeIssueFromProject for: ' + projectId)
		try {
			const project = await this.getProject(projectId, org)

			if (!project) {
				console.log('Could not find project for project id: ' + projectId)
				return
			}
			if (project.projectType === projectType.ProjectV2) {
				const issueProjectV2ItemNodeId = await this.getItemIdFromIssueProjectV2(
					project.projectNodeId,
					issue.nodeId,
				)
				if (!issueProjectV2ItemNodeId) {
					throw new Error('Could not get issueProjectV2ItemNodeId')
				}
				await this.removeIssueFromProjectV2(project.projectNodeId, issueProjectV2ItemNodeId)
				return
			} else if (project.projectType === projectType.Project) {
				await this.removeIssueFromProjectOld(project.projectNodeId, issue.nodeId)
				return
			} else {
				console.error('Unknown project type: ' + project)
			}
		} catch (error) {
			console.error('removeIssueFromProject failed: ' + error)
		}
	}

	async createStatus(
		sha: string,
		context: string,
		state: 'error' | 'failure' | 'pending' | 'success',
		description?: string,
		targetUrl?: string,
	): Promise<void> {
		await this.octokit.repos.createStatus({
			owner: this.params.owner,
			repo: this.params.repo,
			sha: sha,
			context: context,
			state: state,
			target_url: targetUrl,
			description: description,
		})
	}
}

export class OctoKitIssue extends OctoKit implements GitHubIssue {
	private prData: null | PullRequest = null

	constructor(
		token: string,
		protected params: { repo: string; owner: string },
		private issueData: { number: number } | Issue,
		options: { readonly: boolean } = { readonly: false },
	) {
		super(token, params, options)
	}

	async addAssignee(assignee: string): Promise<void> {
		debug('Adding assignee ' + assignee + ' to ' + this.issueData.number)
		if (!this.options.readonly) {
			await this.octokit.issues.addAssignees({
				...this.params,
				issue_number: this.issueData.number,
				assignees: [assignee],
			})
		}
	}

	async removeAssignee(assignee: string): Promise<void> {
		debug('Removing assignee ' + assignee + ' to ' + this.issueData.number)
		if (!this.options.readonly) {
			await this.octokit.issues.removeAssignees({
				...this.params,
				issue_number: this.issueData.number,
				assignees: [assignee],
			})
		}
	}

	async closeIssue(): Promise<void> {
		debug('Closing issue ' + this.issueData.number)
		if (!this.options.readonly)
			await this.octokit.issues.update({
				...this.params,
				issue_number: this.issueData.number,
				state: 'closed',
			})
	}

	async lockIssue(): Promise<void> {
		debug('Locking issue ' + this.issueData.number)
		if (!this.options.readonly)
			await this.octokit.issues.lock({ ...this.params, issue_number: this.issueData.number })
	}

	async getIssue(): Promise<Issue> {
		if (isIssue(this.issueData)) {
			debug('Got issue data from query result ' + this.issueData.number)
			return this.issueData
		}

		console.log('Fetching issue ' + this.issueData.number)
		const issue = (
			await this.octokit.issues.get({
				...this.params,
				issue_number: this.issueData.number,
				mediaType: { previews: ['squirrel-girl'] },
			})
		).data
		return (this.issueData = this.octokitIssueToIssue(issue))
	}

	async getPullRequest(): Promise<PullRequest> {
		if (this.prData) {
			debug('Got cached pr data from query result ' + this.prData.number)
			return this.prData
		}

		console.log('Fetching pull request ' + this.issueData.number)
		const pr = (
			await this.octokit.pulls.get({
				...this.params,
				pull_number: this.issueData.number,
			})
		).data
		return (this.prData = this.octokitPullRequestToPullRequest(pr))
	}

	async postComment(body: string): Promise<void> {
		debug(`Posting comment ${body} on ${this.issueData.number}`)
		if (!this.options.readonly)
			await this.octokit.issues.createComment({
				...this.params,
				issue_number: this.issueData.number,
				body,
			})
	}

	async deleteComment(id: number): Promise<void> {
		debug(`Deleting comment ${id} on ${this.issueData.number}`)
		if (!this.options.readonly)
			await this.octokit.issues.deleteComment({
				owner: this.params.owner,
				repo: this.params.repo,
				comment_id: id,
			})
	}

	async setMilestone(milestoneId: number) {
		debug(`Setting milestone for ${this.issueData.number} to ${milestoneId}`)
		if (!this.options.readonly)
			await this.octokit.issues.update({
				...this.params,
				issue_number: this.issueData.number,
				milestone: milestoneId,
			})
	}

	async *getComments(last?: boolean): AsyncIterableIterator<Comment[]> {
		debug('Fetching comments for ' + this.issueData.number)

		const response = this.octokit.paginate.iterator(
			this.octokit.issues.listComments.endpoint.merge({
				...this.params,
				issue_number: this.issueData.number,
				per_page: 100,
				...(last ? { per_page: 1, page: (await this.getIssue()).numComments } : {}),
			}),
		)

		for await (const page of response) {
			numRequests++
			yield (page.data as Octokit.IssuesListCommentsResponseItem[]).map((comment) => ({
				author: { name: comment.user.login, isGitHubApp: comment.user.type === 'Bot' },
				body: comment.body,
				id: comment.id,
				timestamp: +new Date(comment.created_at),
			}))
		}
	}

	async addLabel(name: string): Promise<void> {
		debug(`Adding label ${name} to ${this.issueData.number}`)
		if (!(await this.repoHasLabel(name))) {
			throw Error(`Action could not execute becuase label ${name} is not defined.`)
		}
		if (!this.options.readonly)
			await this.octokit.issues.addLabels({
				...this.params,
				issue_number: this.issueData.number,
				labels: [name],
			})
	}

	async getAssigner(assignee: string): Promise<string> {
		const options = this.octokit.issues.listEventsForTimeline.endpoint.merge({
			...this.params,
			issue_number: this.issueData.number,
		})

		let assigner: string | undefined

		for await (const event of this.octokit.paginate.iterator(options)) {
			numRequests++
			const timelineEvents = event.data as Octokit.IssuesListEventsForTimelineResponseItem[]
			for (const timelineEvent of timelineEvents) {
				if (
					timelineEvent.event === 'assigned' &&
					(timelineEvent as any).assignee.login === assignee
				) {
					assigner = timelineEvent.actor.login
				}
			}
		}

		if (!assigner) {
			throw Error('Expected to find ' + assignee + ' in issue timeline but did not.')
		}

		return assigner
	}

	async removeLabel(name: string): Promise<void> {
		debug(`Removing label ${name} from ${this.issueData.number}`)
		try {
			if (!this.options.readonly)
				await this.octokit.issues.removeLabel({
					...this.params,
					issue_number: this.issueData.number,
					name,
				})
		} catch (err) {
			if (err instanceof RequestError && err.status === 404) {
				console.log(`Label ${name} not found on issue`)
				return
			}
			throw err
		}
	}

	async getClosingInfo(
		alreadyChecked: number[] = [],
	): Promise<{ hash: string | undefined; timestamp: number } | undefined> {
		if (alreadyChecked.includes(this.issueData.number)) {
			return undefined
		}
		alreadyChecked.push(this.issueData.number)

		if ((await this.getIssue()).open) {
			return
		}

		const closingHashComment = /(?:\\|\/)closedWith (\S*)/

		const options = this.octokit.issues.listEventsForTimeline.endpoint.merge({
			...this.params,
			issue_number: this.issueData.number,
		})
		let closingCommit: { hash: string | undefined; timestamp: number } | undefined
		const crossReferencing: number[] = []
		for await (const event of this.octokit.paginate.iterator(options)) {
			numRequests++

			const timelineEvents = event.data as Octokit.IssuesListEventsForTimelineResponseItem[]
			for (const timelineEvent of timelineEvents) {
				if (
					(timelineEvent.event === 'closed' || timelineEvent.event === 'merged') &&
					timelineEvent.commit_id &&
					timelineEvent.commit_url
						.toLowerCase()
						.includes(`/${this.params.owner}/${this.params.repo}/`.toLowerCase())
				) {
					closingCommit = {
						hash: timelineEvent.commit_id,
						timestamp: +new Date(timelineEvent.created_at),
					}
				}
				if (timelineEvent.event === 'reopened') {
					closingCommit = undefined
				}
				if (
					timelineEvent.event === 'commented' &&
					!((timelineEvent as any).body as string)?.includes('UNABLE_TO_LOCATE_COMMIT_MESSAGE') &&
					closingHashComment.test((timelineEvent as any).body)
				) {
					closingCommit = {
						hash: closingHashComment.exec((timelineEvent as any).body)![1],
						timestamp: +new Date(timelineEvent.created_at),
					}
				}
				if (
					timelineEvent.event === 'cross-referenced' &&
					(timelineEvent as any).source?.issue?.number &&
					(timelineEvent as any).source?.issue?.pull_request?.url.includes(
						`/${this.params.owner}/${this.params.repo}/`.toLowerCase(),
					)
				) {
					crossReferencing.push((timelineEvent as any).source.issue.number)
				}
			}
		}

		// If we dont have any closing info, try to get it from linked issues (PRs).
		// If there's a linked issue that was closed at almost the same time, guess it was a PR that closed this.
		if (!closingCommit) {
			for (const id of crossReferencing.reverse()) {
				const closed = await new OctoKitIssue(this.token, this.params, {
					number: id,
				}).getClosingInfo(alreadyChecked)

				if (closed) {
					if (Math.abs(closed.timestamp - ((await this.getIssue()).closedAt ?? 0)) < 5000) {
						closingCommit = closed
						break
					}
				}
			}
		}

		console.log(`Got ${JSON.stringify(closingCommit)} as closing commit of ${this.issueData.number}`)
		return closingCommit
	}

	async listPullRequestFilenames(): Promise<string[]> {
		const pullNumber = (await this.getIssue()).number
		debug('Listing pull request files for pr #' + pullNumber)
		const options = this.octokit.pulls.listFiles.endpoint.merge({
			...this.params,
			pull_number: pullNumber,
		})

		let filenames: string[] = []

		for await (const resp of this.octokit.paginate.iterator(options)) {
			numRequests++
			const items = resp.data as Octokit.PullsListFilesResponseItem[]
			filenames.push(...items.map((i) => i.filename))
		}

		console.log(`Got filenames for PR #${pullNumber}`, filenames)

		return filenames
	}
}

function isIssue(object: any): object is Issue {
	const isIssue =
		'author' in object &&
		'body' in object &&
		'title' in object &&
		'labels' in object &&
		'open' in object &&
		'locked' in object &&
		'number' in object &&
		'numComments' in object &&
		'reactions' in object &&
		'milestoneId' in object

	return isIssue
}
