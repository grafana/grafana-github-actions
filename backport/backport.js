"use strict";
// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
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
    getLabelNames({ action, label, labels }).forEach(labelName => {
        const matches = labelRegExp.exec(labelName);
        if (matches !== null) {
            const [, base, head = `backport-${pullRequestNumber}-to-${base}`] = matches;
            baseToHead[base] = head;
        }
    });
    return baseToHead;
};
const backportOnce = async ({ base, body, commitToBackport, github, head, labelsToAdd, owner, repo, title, milestone, }) => {
    const git = async (...args) => {
        await exec_1.exec('git', args, { cwd: repo });
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
    if (milestone && milestone.id) {
        await github.issues.update({
            repo,
            owner,
            issue_number: pullRequestNumber,
            milestone: milestone.number,
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
    const worktreePath = `.worktrees/backport-${base}`;
    return [
        `The backport to \`${base}\` failed:`,
        '```',
        errorMessage,
        '```',
        'To backport manually, run these commands in your terminal:',
        '```bash',
        '# Fetch latest updates from GitHub',
        'git fetch',
        '# Create a new working tree',
        `git worktree add ${worktreePath} ${base}`,
        '# Navigate to the new working tree',
        `cd ${worktreePath}`,
        '# Create a new branch',
        `git switch --create ${head}`,
        '# Cherry-pick the merged commit of this pull request and resolve the conflicts',
        `git cherry-pick --mainline 1 ${commitToBackport}`,
        '# Push it to GitHub',
        `git push --set-upstream origin ${head}`,
        '# Go back to the original working tree',
        'cd ../..',
        '# Delete the working tree',
        `git worktree remove ${worktreePath}`,
        '```',
        `Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
    ].join('\n');
};
const backport = async ({ labelsToAdd, payload: { action, label, pull_request: { labels, merge_commit_sha: mergeCommitSha, merged, number: pullRequestNumber, title: originalTitle, milestone, merged_by, }, repository: { name: repo, owner: { login: owner }, }, }, titleTemplate, token, github, }) => {
    if (!merged) {
        console.log('PR not merged');
        return;
    }
    console.log('merged_by', merged_by);
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
    core_1.info(`Backporting ${commitToBackport} from #${pullRequestNumber}`);
    await exec_1.exec('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`]);
    await exec_1.exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    await exec_1.exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
    for (const [base, head] of Object.entries(backportBaseToHead)) {
        const body = `Backport ${commitToBackport} from #${pullRequestNumber}`;
        let title = titleTemplate;
        Object.entries({
            base,
            originalTitle,
        }).forEach(([name, value]) => {
            title = title.replace(new RegExp(lodash_escaperegexp_1.default(`{{${name}}}`), 'g'), value);
        });
        await core_1.group(`Backporting to ${base} on ${head}`, async () => {
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
                });
            }
            catch (error) {
                const errorMessage = error.message;
                core_1.error(error);
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