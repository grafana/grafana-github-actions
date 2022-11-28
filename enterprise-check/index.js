"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const core_1 = require("@actions/core");
const request_error_1 = require("@octokit/request-error");
class EnterpriseCheck extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'EnterpriseCheck';
    }
    async onTriggered(octokit) {
        const sourceBranch = (0, core_1.getInput)('source_branch');
        if (!sourceBranch) {
            throw new Error('Missing source branch');
        }
        const prNumber = (0, core_1.getInput)('pr_number');
        if (!prNumber) {
            throw new Error('Missing OSS PR number');
        }
        let branch = await getBranch(octokit, sourceBranch);
        if (branch) {
            return;
        }
        const targetBranch = (0, core_1.getInput)('target_branch') || 'main';
        branch = await getBranch(octokit, targetBranch);
        if (!branch) {
            branch = await getBranch(octokit, 'main');
            if (!branch) {
                throw new Error('error retrieving main branch');
            }
        }
        await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha);
    }
}
async function getBranch(octokit, branch) {
    let res;
    try {
        res = await octokit.octokit.repos.getBranch({
            branch: branch,
            owner: 'grafana',
            repo: 'grafana-enterprise',
        });
        return res.data;
    }
    catch (err) {
        console.log('err: ', err);
    }
    return null;
}
async function createOrUpdateRef(octokit, prNumber, branch, sha) {
    try {
        await octokit.octokit.git.createRef({
            owner: 'grafana',
            repo: 'grafana-enterprise',
            ref: `refs/heads/prc-${prNumber}-${sha}/${branch}`,
            sha: sha,
        });
    }
    catch (err) {
        if (err instanceof request_error_1.RequestError && err.message === 'Reference already exists') {
            await octokit.octokit.git.updateRef({
                owner: 'grafana',
                repo: 'grafana-enterprise',
                ref: `heads/prc-${prNumber}-${sha}/${branch}`,
                sha: sha,
                force: true,
            });
        }
        else {
            throw err;
        }
    }
}
new EnterpriseCheck().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map