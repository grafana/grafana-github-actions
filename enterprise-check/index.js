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
    async createRef(octokit) {
        (0, core_1.debug)('Getting source branch from input...');
        const sourceBranch = (0, core_1.getInput)('source_branch');
        if (!sourceBranch) {
            throw new Error('Missing source branch');
        }
        (0, core_1.debug)('Getting PR number from input...');
        const prNumber = (0, core_1.getInput)('pr_number');
        if (!prNumber) {
            throw new Error('Missing OSS PR number');
        }
        (0, core_1.debug)('Getting source commit from input...');
        const sourceSha = (0, core_1.getInput)('source_sha');
        if (!sourceSha) {
            throw new Error('Missing OSS source SHA');
        }
        (0, core_1.debug)('Getting branch ref from grafana enterprise...');
        try {
            let branch = await getBranch(octokit, sourceBranch);
            if (branch) {
                // Create the branch from the ref found in grafana-enterprise.
                await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
                return;
            }
        }
        catch (err) {
            console.log('error fetching branch with same name in Enterprise', err);
        }
        (0, core_1.debug)("Branch in grafana enterprise doesn't exist, getting branch from 'target_branch' or 'main'...");
        // If the source branch was not found on Enterprise, then attempt to use the targetBranch (likely something like v9.2.x).
        // If the targetBranch was not found, then use `main`. If `main` wasn't found, then we have a problem.
        const targetBranch = (0, core_1.getInput)('target_branch') || 'main';
        try {
            const branch = await getBranch(octokit, targetBranch);
            if (branch) {
                // Create the branch from the ref found in grafana-enterprise.
                await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
                return;
            }
        }
        catch (err) {
            console.log(`error fetching ${targetBranch}:`, err);
        }
        try {
            const branch = await getBranch(octokit, 'main');
            if (branch) {
                // Create the branch from the ref found in grafana-enterprise.
                await createOrUpdateRef(octokit, prNumber, sourceBranch, branch.commit.sha, sourceSha);
                return;
            }
        }
        catch (err) {
            console.log('error fetching main:', err);
        }
        throw new Error('Failed to create upstream ref; no branch was found. Not even main.');
    }
    async onTriggered(octokit) {
        try {
            await this.createRef(octokit);
        }
        catch (err) {
            if (err instanceof Error) {
                (0, core_1.setFailed)(err);
            }
        }
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
        console.log('Could not get branch from upstream:', err);
        throw err;
    }
}
async function createOrUpdateRef(octokit, prNumber, branch, sha, sourceSha) {
    const ref = `refs/heads/prc-${prNumber}-${sourceSha}/${branch}`;
    (0, core_1.debug)(`Creating ref in grafana-enterprise: '${ref}'`);
    try {
        await octokit.octokit.git.createRef({
            owner: 'grafana',
            repo: 'grafana-enterprise',
            ref: ref,
            sha: sha,
        });
    }
    catch (err) {
        if (err instanceof request_error_1.RequestError && err.message === 'Reference already exists') {
            await octokit.octokit.git.updateRef({
                owner: 'grafana',
                repo: 'grafana-enterprise',
                ref: ref,
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