"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
class RemoveMilestone extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'RemoveMilestone';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const version = this.getVersion();
        for (const issue of await getIssuesForVersion(octokit, version)) {
            await octokit.octokit.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                milestone: null,
            });
            await octokit.octokit.issues.createComment({
                body: `This issue was removed from the ${version} milestone because ${version} is currently being released.`,
                issue_number: issue.number,
                owner,
                repo,
            });
        }
        for (const issue of await getPullRequestsForVersion(octokit, version)) {
            await octokit.octokit.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                milestone: null,
            });
            await octokit.octokit.issues.createComment({
                body: `This pull request was removed from the ${version} milestone because ${version} is currently being released.`,
                issue_number: issue.number,
                owner,
                repo,
            });
        }
    }
}
async function getIssuesForVersion(octokit, version) {
    const issueList = [];
    for await (const page of octokit.query({ q: `is:issue is:open milestone:${version}` })) {
        for (const issue of page) {
            issueList.push(await issue.getIssue());
        }
    }
    return issueList;
}
async function getPullRequestsForVersion(octokit, version) {
    const issueList = [];
    for await (const page of octokit.query({ q: `is:pr is:open milestone:${version} base:main` })) {
        for (const issue of page) {
            issueList.push(await issue.getIssue());
        }
    }
    return issueList;
}
new RemoveMilestone().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map