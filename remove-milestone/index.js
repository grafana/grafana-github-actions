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
        const payload = github_1.context.payload;
        const version = payload.inputs.version;
        if (!version) {
            throw new Error('Missing version input');
        }
        for (const issue of await getIssuesForVersion(octokit, version)) {
            octokit.octokit.issues.update({
                owner,
                repo,
                issue_number: issue.number,
                milestone: null,
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
new RemoveMilestone().run();
//# sourceMappingURL=index.js.map