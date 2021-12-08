"use strict";
// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backport = void 0;
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const git_1 = require("../common/git");
const labelRegExp = /^backport ([^ ]+)(?: ([^ ]+))?$/;
const getLabelNames = ({ action, label, labels, }) => {
    switch (action) {
        case 'closed':
            return labels.map(({ name }) => name);
        case 'labeled':
            return [label.name];
        default:
            return [];
    }
};
const getBackportBaseToHead = ({ action, label, labels, pullRequestNumber, }) => {
    const baseToHead = {};
    getLabelNames({ action, label, labels }).forEach((labelName) => {
        const matches = labelRegExp.exec(labelName);
        if (matches !== null) {
            const [, base, head = `backport-${pullRequestNumber}-to-${base}`] = matches;
            baseToHead[base] = head;
        }
    });
    return baseToHead;
};
const backportOnce = async ({ base, body, commitToBackport, github, head, labelsToAdd, owner, repo, title, milestone, mergedBy, }) => {
    const git = async (...args) => {
        await (0, exec_1.exec)('git', args, { cwd: repo });
    };
    await git('switch', base);
    await git('switch', '--create', head);
    try {
        await git('cherry-pick', '-x', commitToBackport);
    }
    catch (error) {
        await git('cherry-pick', '--abort');
        throw error;
    }
    await git('push', '--set-upstream', 'origin', head);
    const createRsp = await github.pulls.create({
        base,
        body,
        head,
        owner,
        repo,
        title,
    });
    const pullRequestNumber = createRsp.data.number;
    // Sync milestone
    if (milestone && milestone.id) {
        await github.issues.update({
            repo,
            owner,
            issue_number: pullRequestNumber,
            milestone: milestone.number,
        });
    }
    // Remove default reviewers
    if (createRsp.data.requested_reviewers) {
        const reviewers = createRsp.data.requested_reviewers.map((user) => user.login);
        await github.pulls.deleteReviewRequest({
            pull_number: pullRequestNumber,
            repo,
            owner,
            reviewers: reviewers,
        });
    }
    if (mergedBy) {
        // Assign to merger
        await github.pulls.createReviewRequest({
            pull_number: pullRequestNumber,
            repo,
            owner,
            reviewers: [mergedBy.login],
        });
    }
    if (labelsToAdd.length > 0) {
        await github.issues.addLabels({
            issue_number: pullRequestNumber,
            labels: labelsToAdd,
            owner,
            repo,
        });
    }
};
const getFailedBackportCommentBody = ({ base, commitToBackport, errorMessage, head, }) => {
    return [
        `The backport to \`${base}\` failed:`,
        '```',
        errorMessage,
        '```',
        'To backport manually, run these commands in your terminal:',
        '```bash',
        '# Fetch latest updates from GitHub',
        'git fetch',
        '# Create a new branch',
        `git switch --create ${head} origin/${base}`,
        '# Cherry-pick the merged commit of this pull request and resolve the conflicts',
        `git cherry-pick -x ${commitToBackport}`,
        '# Push it to GitHub',
        `git push --set-upstream origin ${head}`,
        `git switch main`,
        '# Remove the local backport branch',
        `git branch -D ${head}`,
        '```',
        `Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
    ].join('\n');
};
const backport = async ({ labelsToAdd, payload: { action, label, pull_request: { labels, merge_commit_sha: mergeCommitSha, merged, number: pullRequestNumber, title: originalTitle, milestone, merged_by, }, repository: { name: repo, owner: { login: owner }, }, }, titleTemplate, token, github, }) => {
    if (!merged) {
        console.log('PR not merged');
        return;
    }
    const backportBaseToHead = getBackportBaseToHead({
        action,
        // The payload has a label property when the action is "labeled".
        label: label,
        labels,
        pullRequestNumber,
    });
    if (Object.keys(backportBaseToHead).length === 0) {
        return;
    }
    // The merge commit SHA is actually not null.
    const commitToBackport = String(mergeCommitSha);
    (0, core_1.info)(`Backporting ${commitToBackport} from #${pullRequestNumber}`);
    await (0, git_1.cloneRepo)({ token, owner, repo });
    for (const [base, head] of Object.entries(backportBaseToHead)) {
        const body = `Backport ${commitToBackport} from #${pullRequestNumber}`;
        let title = titleTemplate;
        Object.entries({
            base,
            originalTitle,
        }).forEach(([name, value]) => {
            title = title.replace(new RegExp((0, lodash_escaperegexp_1.default)(`{{${name}}}`), 'g'), value);
        });
        await (0, core_1.group)(`Backporting to ${base} on ${head}`, async () => {
            try {
                await backportOnce({
                    base,
                    body,
                    commitToBackport,
                    github: github,
                    head,
                    labelsToAdd,
                    owner,
                    repo,
                    title,
                    milestone,
                    mergedBy: merged_by,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error while backporting';
                (0, core_1.error)(errorMessage);
                // Create comment
                await github.issues.createComment({
                    body: getFailedBackportCommentBody({
                        base,
                        commitToBackport,
                        errorMessage,
                        head,
                    }),
                    issue_number: pullRequestNumber,
                    owner,
                    repo,
                });
            }
        });
    }
};
exports.backport = backport;
//# sourceMappingURL=backport.js.map