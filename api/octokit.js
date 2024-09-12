"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.OctoKitIssue = exports.OctoKit = exports.getNumRequests = void 0;
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const request_error_1 = require("@octokit/request-error");
const graphql_1 = require("@octokit/graphql");
const child_process_1 = require("child_process");
const api_1 = require("./api");
let numRequests = 0;
const getNumRequests = () => numRequests;
exports.getNumRequests = getNumRequests;
class OctoKit {
    constructor(token, params, options = { readonly: false }) {
        this.token = token;
        this.params = params;
        this.options = options;
        // when in readonly mode, record labels just-created so at to not throw unneccesary errors
        this.mockLabels = new Set();
        this.writeAccessCache = {};
        this.orgMembersCache = {};
        console.debug('Constructor OctoKit init');
        this._octokit = new github_1.GitHub(token);
        this._octokitGraphQL = graphql_1.graphql.defaults({
            headers: {
                authorization: `token ${token}`,
            },
        });
        console.debug('Constructor OctoKit end');
    }
    get octokit() {
        numRequests++;
        return this._octokit;
    }
    get octokitGraphQL() {
        return this._octokitGraphQL;
    }
    // TODO: just iterate over the issues in a page here instead of making caller do it
    async *query(query) {
        const q = query.q + ` repo:${this.params.owner}/${query.repo ?? this.params.repo}`;
        console.log(`Querying for ${q}:`);
        const options = this.octokit.search.issuesAndPullRequests.endpoint.merge({
            ...query,
            q,
            per_page: 100,
            headers: { Accept: 'application/vnd.github.squirrel-girl-preview+json' },
        });
        let pageNum = 0;
        const timeout = async () => {
            if (pageNum < 2) {
                /* pass */
            }
            else if (pageNum < 4) {
                await new Promise((resolve) => setTimeout(resolve, 3000));
            }
            else {
                await new Promise((resolve) => setTimeout(resolve, 30000));
            }
        };
        for await (const pageResponse of this.octokit.paginate.iterator(options)) {
            await timeout();
            numRequests++;
            const page = pageResponse.data;
            console.log(`Page ${++pageNum}: ${page.map(({ number }) => number).join(' ')}`);
            yield page.map((issue) => new OctoKitIssue(this.token, this.params, this.octokitIssueToIssue(issue)));
        }
    }
    async getMilestone(number) {
        const res = await this.octokit.issues.getMilestone({
            owner: this.params.owner,
            repo: this.params.repo,
            milestone_number: number,
        });
        return {
            closed_at: res.data.closed_at,
            title: res.data.title,
            number,
        };
    }
    async createIssue(owner, repo, title, body) {
        (0, core_1.debug)(`Creating issue \`${title}\` on ${owner}/${repo}`);
        if (!this.options.readonly)
            await this.octokit.issues.create({ owner, repo, title, body });
    }
    octokitIssueToIssue(issue) {
        return {
            author: { name: issue.user.login, isGitHubApp: issue.user.type === 'Bot' },
            body: issue.body,
            number: issue.number,
            title: issue.title,
            labels: issue.labels.map((label) => label.name),
            open: issue.state === 'open',
            locked: issue.locked,
            numComments: issue.comments,
            reactions: issue.reactions,
            assignee: issue.assignee?.login ?? issue.assignees?.[0]?.login,
            milestoneId: issue.milestone?.number ?? null,
            createdAt: +new Date(issue.created_at),
            updatedAt: +new Date(issue.updated_at),
            closedAt: issue.closed_at ? +new Date(issue.closed_at) : undefined,
            isPullRequest: !!issue.pull_request,
            nodeId: issue.node_id,
        };
    }
    octokitPullRequestToPullRequest(pr) {
        return {
            number: pr.number,
            headSHA: pr.head.sha,
            milestoneId: pr.milestone?.number,
        };
    }
    async hasWriteAccess(user) {
        if (user.name in this.writeAccessCache) {
            (0, core_1.debug)('Got permissions from cache for ' + user);
            return this.writeAccessCache[user.name];
        }
        (0, core_1.debug)('Fetching permissions for ' + user);
        const permissions = (await this.octokit.repos.getCollaboratorPermissionLevel({
            ...this.params,
            username: user.name,
        })).data.permission;
        return (this.writeAccessCache[user.name] = permissions === 'admin' || permissions === 'write');
    }
    async repoHasLabel(name) {
        try {
            await this.octokit.issues.getLabel({ ...this.params, name });
            return true;
        }
        catch (err) {
            if (err instanceof request_error_1.RequestError && err.status === 404) {
                return this.options.readonly && this.mockLabels.has(name);
            }
            throw err;
        }
    }
    async createLabel(name, color, description) {
        (0, core_1.debug)('Creating label ' + name);
        if (!this.options.readonly)
            await this.octokit.issues.createLabel({ ...this.params, color, description, name });
        else
            this.mockLabels.add(name);
    }
    async deleteLabel(name) {
        (0, core_1.debug)('Deleting label ' + name);
        try {
            if (!this.options.readonly)
                await this.octokit.issues.deleteLabel({ ...this.params, name });
        }
        catch (err) {
            if (err instanceof request_error_1.RequestError && err.status === 404) {
                return;
            }
            throw err;
        }
    }
    async readConfig(path) {
        (0, core_1.debug)('Reading config at ' + path);
        const repoPath = `.github/${path}.json`;
        try {
            const data = (await this.octokit.repos.getContents({ ...this.params, path: repoPath })).data;
            if ('type' in data && data.type === 'file') {
                if (data.encoding === 'base64' && data.content) {
                    return JSON.parse(Buffer.from(data.content, 'base64').toString('utf-8'));
                }
                throw Error(`Could not read contents "${data.content}" in encoding "${data.encoding}"`);
            }
            throw Error('Found directory at config path when expecting file' + JSON.stringify(data));
        }
        catch (e) {
            throw Error('Error with config file at ' + repoPath + ': ' + JSON.stringify(e));
        }
    }
    async releaseContainsCommit(release, commit) {
        return new Promise((resolve, reject) => (0, child_process_1.exec)(`git -C ./repo merge-base --is-ancestor ${commit} ${release}`, (err) => {
            if (!err || err.code === 1) {
                resolve(!err ? 'yes' : 'no');
            }
            else if (err.message.includes(`Not a valid commit name ${release}`)) {
                // release branch is forked. Probably in endgame. Not released.
                resolve('no');
            }
            else if (err.message.includes(`Not a valid commit name ${commit}`)) {
                // commit is probably in a different repo.
                resolve('unknown');
            }
            else {
                reject(err);
            }
        }));
    }
    async dispatch(title) {
        (0, core_1.debug)('Dispatching ' + title);
        if (!this.options.readonly)
            await this.octokit.repos.createDispatchEvent({ ...this.params, event_type: title });
    }
    async getRepoInfo() {
        return await this.octokit.repos.get({ owner: this.params.owner, repo: this.params.repo });
    }
    async isUserMemberOfOrganization(org, username) {
        if (org in this.orgMembersCache && username in this.orgMembersCache[org]) {
            (0, core_1.debug)('Got user  ' + username + ' is member of organization ' + org + ' from cache');
            return this.orgMembersCache[org][username];
        }
        if (!(org in this.orgMembersCache)) {
            this.orgMembersCache[org] = {};
        }
        (0, core_1.debug)('Checking if user ' + username + ' is member of organization ' + org);
        try {
            const resp = await this.octokit.orgs.checkMembership({ org, username });
            (0, core_1.debug)('isUserMemberOfOrganization response status ' + resp.status);
            // 204 is the response if requester is an organization member and user is a member
            this.orgMembersCache[org][username] = resp.status === 204;
            return this.orgMembersCache[org][username];
        }
        catch (err) {
            (0, core_1.debug)('isUserMemberOfOrganization error response ' + err);
            if (err instanceof request_error_1.RequestError && err.status === 404) {
                this.orgMembersCache[org][username] = false;
                return this.orgMembersCache[org][username];
            }
            throw err;
        }
    }
    async getProject(projectId, org, columnName) {
        console.debug('Running getProject for project ' + projectId);
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
            }));
            console.debug('getProject result ' + JSON.stringify(result));
            if (result.organization.projectV2 && result.organization.projectV2.id) {
                return {
                    projectType: api_1.projectType.ProjectV2,
                    projectNodeId: result.organization.projectV2.id,
                };
            }
            else if (result.organization.project && result.organization.project.id && columnName) {
                // try to find the right column
                for (const column of result.organization.project.columns.edges) {
                    if (column.node.name === columnName) {
                        return {
                            projectType: api_1.projectType.Project,
                            projectNodeId: result.organization.project.id,
                            columnNodeId: column.node.id,
                        };
                    }
                }
                return undefined;
            }
        }
        catch (error) {
            console.error('Could not get project node id ' + error);
        }
        return undefined;
    }
    async addIssueToProjectOld(projectColumnId, issueNodeId) {
        console.log('Running addIssueToProjectOld with: projectColumnId: ', projectColumnId, ' issueNodeId: ', issueNodeId);
        const mutation = `mutation addProjectCard($projectColumnId: ID!, $issueNodeId: ID!) {
			addProjectCard(input: {projectColumnId: $projectColumnId, contentId: $issueNodeId}) {
				cardEdge {
					node {
					  id
					}
				  }
			}
		  }`;
        return await this._octokitGraphQL({
            query: mutation,
            projectColumnId,
            issueNodeId,
        });
    }
    async removeIssueFromProjectOld(projectNodeId, issueNodeId) {
        console.log('Running removeIssueFromProjectOld with: projectNodeId: ', projectNodeId, ' issueNodeId: ', issueNodeId);
        const mutation = `mutation deleteProjectNextItem($projectNodeId: ID!, $issueNodeId: ID!) {
			deleteProjectNextItem(input: {projectId: $projectNodeId, itemId: $issueNodeId}) {
				deletedItemId
			}
		  }`;
        return await this._octokitGraphQL({
            query: mutation,
            projectNodeId,
            issueNodeId,
        });
    }
    async addIssueToProjectV2(projectNodeId, issueNodeId) {
        console.log('Running addIssueToProjectV2 with: projectNodeId: ', projectNodeId, ' issueNodeId: ', issueNodeId);
        const mutation = `mutation addIssueToProject($projectNodeId: ID!, $issueNodeId: ID!){
			addProjectV2ItemById(input: {projectId: $projectNodeId, contentId: $issueNodeId}) {
				item {
				  id
				}
			  }
		}`;
        return await this._octokitGraphQL({
            query: mutation,
            projectNodeId,
            issueNodeId,
        });
    }
    async getItemIdFromIssueProjectV2(projectNodeId, issueNodeId) {
        console.log('Running getItemIdFromIssueProjectV2 with: projectNodeId: ', projectNodeId, ' issueNodeId: ', issueNodeId);
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
		}`;
        try {
            const results = (await this._octokitGraphQL({
                query: mutation,
                issueNodeId,
            }));
            // finding the right issueProjectV2NodeId
            for (const issueProjectV2Node of results.node.projectItems.nodes) {
                if (issueProjectV2Node.project &&
                    issueProjectV2Node.project.id &&
                    issueProjectV2Node.project.id === projectNodeId) {
                    return issueProjectV2Node.id;
                }
            }
            throw new Error('Could not find the right project' + JSON.stringify(results));
        }
        catch (error) {
            console.error('getItemIdFromIssueProjectV2 failed: ' + error);
        }
        return undefined;
    }
    async removeIssueFromProjectV2(projectNodeId, issueNodeId) {
        console.log('Running removeIssueFromProjectV2 with: projectNodeId: ', projectNodeId, 'issueNodeId: ', issueNodeId);
        const mutation = `mutation removeIssueFromProject($projectNodeId: ID!, $issueNodeId: ID!){
			deleteProjectV2Item(
			  input: {
				projectId: $projectNodeId
				itemId: $issueNodeId
			  }
			) {
			  deletedItemId
			}
		  }`;
        return await this._octokitGraphQL({
            query: mutation,
            projectNodeId,
            issueNodeId,
        });
    }
    async addIssueToProject(projectId, issue, org = 'grafana', columnName) {
        console.debug('Running addIssueToProject for: ' + projectId);
        try {
            const project = await this.getProject(projectId, org, columnName);
            if (!project) {
                console.log('Could not find project for project id: ' + projectId);
                return;
            }
            if (project.projectType === api_1.projectType.ProjectV2) {
                await this.addIssueToProjectV2(project.projectNodeId, issue.nodeId);
            }
            else if (project.projectType === api_1.projectType.Project && project.columnNodeId) {
                await this.addIssueToProjectOld(project.columnNodeId, issue.nodeId);
            }
            else {
                console.error('Unknown project type or column name: ' + project);
            }
        }
        catch (error) {
            console.error('addIssueToProject failed: ' + error);
        }
    }
    async removeIssueFromProject(projectId, issue, org = 'grafana') {
        console.debug('Running removeIssueFromProject for: ' + projectId);
        try {
            const project = await this.getProject(projectId, org);
            if (!project) {
                console.log('Could not find project for project id: ' + projectId);
                return;
            }
            if (project.projectType === api_1.projectType.ProjectV2) {
                const issueProjectV2ItemNodeId = await this.getItemIdFromIssueProjectV2(project.projectNodeId, issue.nodeId);
                if (!issueProjectV2ItemNodeId) {
                    throw new Error('Could not get issueProjectV2ItemNodeId');
                }
                await this.removeIssueFromProjectV2(project.projectNodeId, issueProjectV2ItemNodeId);
                return;
            }
            else if (project.projectType === api_1.projectType.Project) {
                await this.removeIssueFromProjectOld(project.projectNodeId, issue.nodeId);
                return;
            }
            else {
                console.error('Unknown project type: ' + project);
            }
        }
        catch (error) {
            console.error('removeIssueFromProject failed: ' + error);
        }
    }
    async createStatus(sha, context, state, description, targetUrl) {
        await this.octokit.repos.createStatus({
            owner: this.params.owner,
            repo: this.params.repo,
            sha: sha,
            context: context,
            state: state,
            target_url: targetUrl,
            description: description,
        });
    }
}
exports.OctoKit = OctoKit;
class OctoKitIssue extends OctoKit {
    constructor(token, params, issueData, options = { readonly: false }) {
        super(token, params, options);
        this.params = params;
        this.issueData = issueData;
        this.prData = null;
    }
    async addAssignee(assignee) {
        (0, core_1.debug)('Adding assignee ' + assignee + ' to ' + this.issueData.number);
        if (!this.options.readonly) {
            await this.octokit.issues.addAssignees({
                ...this.params,
                issue_number: this.issueData.number,
                assignees: [assignee],
            });
        }
    }
    async removeAssignee(assignee) {
        (0, core_1.debug)('Removing assignee ' + assignee + ' to ' + this.issueData.number);
        if (!this.options.readonly) {
            await this.octokit.issues.removeAssignees({
                ...this.params,
                issue_number: this.issueData.number,
                assignees: [assignee],
            });
        }
    }
    async closeIssue() {
        (0, core_1.debug)('Closing issue ' + this.issueData.number);
        if (!this.options.readonly)
            await this.octokit.issues.update({
                ...this.params,
                issue_number: this.issueData.number,
                state: 'closed',
            });
    }
    async lockIssue() {
        (0, core_1.debug)('Locking issue ' + this.issueData.number);
        if (!this.options.readonly)
            await this.octokit.issues.lock({ ...this.params, issue_number: this.issueData.number });
    }
    async getIssue() {
        if (isIssue(this.issueData)) {
            (0, core_1.debug)('Got issue data from query result ' + this.issueData.number);
            return this.issueData;
        }
        console.log('Fetching issue ' + this.issueData.number);
        const issue = (await this.octokit.issues.get({
            ...this.params,
            issue_number: this.issueData.number,
            mediaType: { previews: ['squirrel-girl'] },
        })).data;
        return (this.issueData = this.octokitIssueToIssue(issue));
    }
    async getPullRequest() {
        if (this.prData) {
            (0, core_1.debug)('Got cached pr data from query result ' + this.prData.number);
            return this.prData;
        }
        console.log('Fetching pull request ' + this.issueData.number);
        const pr = (await this.octokit.pulls.get({
            ...this.params,
            pull_number: this.issueData.number,
        })).data;
        return (this.prData = this.octokitPullRequestToPullRequest(pr));
    }
    async postComment(body) {
        (0, core_1.debug)(`Posting comment ${body} on ${this.issueData.number}`);
        if (!this.options.readonly)
            await this.octokit.issues.createComment({
                ...this.params,
                issue_number: this.issueData.number,
                body,
            });
    }
    async deleteComment(id) {
        (0, core_1.debug)(`Deleting comment ${id} on ${this.issueData.number}`);
        if (!this.options.readonly)
            await this.octokit.issues.deleteComment({
                owner: this.params.owner,
                repo: this.params.repo,
                comment_id: id,
            });
    }
    async setMilestone(milestoneId) {
        (0, core_1.debug)(`Setting milestone for ${this.issueData.number} to ${milestoneId}`);
        if (!this.options.readonly)
            await this.octokit.issues.update({
                ...this.params,
                issue_number: this.issueData.number,
                milestone: milestoneId,
            });
    }
    async *getComments(last) {
        (0, core_1.debug)('Fetching comments for ' + this.issueData.number);
        const response = this.octokit.paginate.iterator(this.octokit.issues.listComments.endpoint.merge({
            ...this.params,
            issue_number: this.issueData.number,
            per_page: 100,
            ...(last ? { per_page: 1, page: (await this.getIssue()).numComments } : {}),
        }));
        for await (const page of response) {
            numRequests++;
            yield page.data.map((comment) => ({
                author: { name: comment.user.login, isGitHubApp: comment.user.type === 'Bot' },
                body: comment.body,
                id: comment.id,
                timestamp: +new Date(comment.created_at),
            }));
        }
    }
    async addLabel(name) {
        (0, core_1.debug)(`Adding label ${name} to ${this.issueData.number}`);
        if (!(await this.repoHasLabel(name))) {
            throw Error(`Action could not execute becuase label ${name} is not defined.`);
        }
        if (!this.options.readonly)
            await this.octokit.issues.addLabels({
                ...this.params,
                issue_number: this.issueData.number,
                labels: [name],
            });
    }
    async getAssigner(assignee) {
        const options = this.octokit.issues.listEventsForTimeline.endpoint.merge({
            ...this.params,
            issue_number: this.issueData.number,
        });
        let assigner;
        for await (const event of this.octokit.paginate.iterator(options)) {
            numRequests++;
            const timelineEvents = event.data;
            for (const timelineEvent of timelineEvents) {
                if (timelineEvent.event === 'assigned' &&
                    timelineEvent.assignee.login === assignee) {
                    assigner = timelineEvent.actor.login;
                }
            }
        }
        if (!assigner) {
            throw Error('Expected to find ' + assignee + ' in issue timeline but did not.');
        }
        return assigner;
    }
    async removeLabel(name) {
        (0, core_1.debug)(`Removing label ${name} from ${this.issueData.number}`);
        try {
            if (!this.options.readonly)
                await this.octokit.issues.removeLabel({
                    ...this.params,
                    issue_number: this.issueData.number,
                    name,
                });
        }
        catch (err) {
            if (err instanceof request_error_1.RequestError && err.status === 404) {
                console.log(`Label ${name} not found on issue`);
                return;
            }
            throw err;
        }
    }
    async getClosingInfo(alreadyChecked = []) {
        if (alreadyChecked.includes(this.issueData.number)) {
            return undefined;
        }
        alreadyChecked.push(this.issueData.number);
        if ((await this.getIssue()).open) {
            return;
        }
        const closingHashComment = /(?:\\|\/)closedWith (\S*)/;
        const options = this.octokit.issues.listEventsForTimeline.endpoint.merge({
            ...this.params,
            issue_number: this.issueData.number,
        });
        let closingCommit;
        const crossReferencing = [];
        for await (const event of this.octokit.paginate.iterator(options)) {
            numRequests++;
            const timelineEvents = event.data;
            for (const timelineEvent of timelineEvents) {
                if ((timelineEvent.event === 'closed' || timelineEvent.event === 'merged') &&
                    timelineEvent.commit_id &&
                    timelineEvent.commit_url
                        .toLowerCase()
                        .includes(`/${this.params.owner}/${this.params.repo}/`.toLowerCase())) {
                    closingCommit = {
                        hash: timelineEvent.commit_id,
                        timestamp: +new Date(timelineEvent.created_at),
                    };
                }
                if (timelineEvent.event === 'reopened') {
                    closingCommit = undefined;
                }
                if (timelineEvent.event === 'commented' &&
                    !timelineEvent.body?.includes('UNABLE_TO_LOCATE_COMMIT_MESSAGE') &&
                    closingHashComment.test(timelineEvent.body)) {
                    closingCommit = {
                        hash: closingHashComment.exec(timelineEvent.body)[1],
                        timestamp: +new Date(timelineEvent.created_at),
                    };
                }
                if (timelineEvent.event === 'cross-referenced' &&
                    timelineEvent.source?.issue?.number &&
                    timelineEvent.source?.issue?.pull_request?.url.includes(`/${this.params.owner}/${this.params.repo}/`.toLowerCase())) {
                    crossReferencing.push(timelineEvent.source.issue.number);
                }
            }
        }
        // If we dont have any closing info, try to get it from linked issues (PRs).
        // If there's a linked issue that was closed at almost the same time, guess it was a PR that closed this.
        if (!closingCommit) {
            for (const id of crossReferencing.reverse()) {
                const closed = await new OctoKitIssue(this.token, this.params, {
                    number: id,
                }).getClosingInfo(alreadyChecked);
                if (closed) {
                    if (Math.abs(closed.timestamp - ((await this.getIssue()).closedAt ?? 0)) < 5000) {
                        closingCommit = closed;
                        break;
                    }
                }
            }
        }
        console.log(`Got ${JSON.stringify(closingCommit)} as closing commit of ${this.issueData.number}`);
        return closingCommit;
    }
    async listPullRequestFilenames() {
        const pullNumber = (await this.getIssue()).number;
        (0, core_1.debug)('Listing pull request files for pr #' + pullNumber);
        const options = this.octokit.pulls.listFiles.endpoint.merge({
            ...this.params,
            pull_number: pullNumber,
        });
        let filenames = [];
        for await (const resp of this.octokit.paginate.iterator(options)) {
            numRequests++;
            const items = resp.data;
            filenames.push(...items.map((i) => i.filename));
        }
        console.log(`Got filenames for PR #${pullNumber}`, filenames);
        return filenames;
    }
}
exports.OctoKitIssue = OctoKitIssue;
function isIssue(object) {
    const isIssue = 'author' in object &&
        'body' in object &&
        'title' in object &&
        'labels' in object &&
        'open' in object &&
        'locked' in object &&
        'number' in object &&
        'numComments' in object &&
        'reactions' in object &&
        'milestoneId' in object;
    return isIssue;
}
//# sourceMappingURL=octokit.js.map