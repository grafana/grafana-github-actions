"use strict";
// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backport = exports.getFailedBackportCommentBody = void 0;
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const github_1 = require("@actions/github");
const betterer_1 = require("@betterer/betterer");
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const git_1 = require("../common/git");
const BETTERER_RESULTS_PATH = '.betterer.results';
exports.BETTERER_RESULTS_PATH = BETTERER_RESULTS_PATH;
const labelRegExp = /backport ([^ ]+)(?: ([^ ]+))?$/;
const backportLabels = ['type/docs', 'type/bug', 'product-approved', 'type/ci'];
const missingLabels = 'missing-labels';
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
function getMatchedBackportLabels(labelsPR, backportLabels) {
    let matchedLabels = [];
    for (const prLabel of labelsPR) {
        for (let backportLabel of backportLabels) {
            if (backportLabel === prLabel) {
                matchedLabels.push(backportLabel);
            }
        }
    }
    return matchedLabels;
}
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
const isBettererConflict = async (gitUnmergedPaths) => {
    return gitUnmergedPaths.length === 1 && gitUnmergedPaths[0] === BETTERER_RESULTS_PATH;
};
exports.isBettererConflict = isBettererConflict;
const backportOnce = async ({ base, body, commitToBackport, github, head, labelsToAdd, owner, repo, title, mergedBy, }) => {
    const git = async (...args) => {
        await (0, exec_1.exec)('git', args, { cwd: repo });
    };
    const gitDiffUnmergedPaths = async () => {
        const { stdout } = await (0, exec_1.getExecOutput)('git', ['diff', '--name-only', '--diff-filter=U'], {
            cwd: repo,
        });
        return stdout.trim().split(/\r?\n/);
    };
    const fixBettererConflict = async () => {
        await (0, betterer_1.betterer)({ update: true, cwd: repo });
        await git('add', BETTERER_RESULTS_PATH);
        // Setting -c core.editor=true will prevent the commit message editor from opening
        await git('-c', 'core.editor=true', 'cherry-pick', '--continue');
    };
    await git('switch', base);
    await git('switch', '--create', head);
    try {
        await git('cherry-pick', '-x', commitToBackport);
    }
    catch (error) {
        const gitUnmergedPaths = await gitDiffUnmergedPaths();
        if (await isBettererConflict(gitUnmergedPaths)) {
            try {
                await fixBettererConflict();
            }
            catch (error) {
                await git('cherry-pick', '--abort');
                throw error;
            }
        }
        else {
            await git('cherry-pick', '--abort');
            throw error;
        }
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
const getFailedBackportCommentBody = ({ base, commitToBackport, errorMessage, head, title, }) => {
    const backportMilestone = base.startsWith('v') ? base.substring(1) : base;
    const escapedTitle = title.replaceAll('"', '\\"');
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
        '# When the conflicts are resolved, stage and commit the changes',
        `git add . && git cherry-pick --continue`,
        '# Push it to GitHub with the GitHub CLI',
        `gh pr create --title "${escapedTitle}" --label backport --base ${base} --milestone ${backportMilestone}`,
        "# If you don't have the GitHub CLI installed:",
        `git push --set-upstream origin ${head}`,
        '# Remove the local backport branch',
        `git switch main`,
        `git branch -D ${head}`,
        '```',
        `Then, create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
    ].join('\n');
};
exports.getFailedBackportCommentBody = getFailedBackportCommentBody;
const backport = async ({ labelsToAdd, payload: { action, label, pull_request: { labels, merge_commit_sha: mergeCommitSha, merged, number: pullRequestNumber, title: originalTitle, merged_by, }, repository: { name: repo, owner: { login: owner }, }, }, titleTemplate, token, github, sender, }) => {
    const payload = github_1.context.payload;
    console.log('payloadAction: ' + payload.action);
    if (payload.action !== 'closed') {
        let payloadLabel = typeof payload.label?.name === 'string' ? payload.label.name : '';
        if (!(labelRegExp.test(payloadLabel) || backportLabels.includes(payloadLabel))) {
            return;
        }
    }
    let labelsString = labels.map(({ name }) => name);
    let matchedLabels = getMatchedBackportLabels(labelsString, backportLabels);
    let matches = false;
    for (const label of labelsString) {
        matches = labelRegExp.test(label);
        if (matches) {
            break;
        }
    }
    if (matches && matchedLabels.length == 0 && !labelsString.includes(missingLabels)) {
        console.log('PR intended to be backported, but not labeled properly. Labels: ' +
            labelsString +
            '\n Author: ' +
            sender.login);
        await github.issues.createComment({
            body: [
                'Hello ' + '@' + sender.login + '!',
                'Backport pull requests need to be either:',
                '* Pull requests which address bugs,',
                '* Urgent fixes which need product approval, in order to get merged,',
                '* Docs changes.\n',
                'Please, if the current pull request addresses a bug fix, label it with the `type/bug` label.',
                'If it already has the product approval, please add the `product-approved` label. For docs changes, please add the `type/docs` label.',
                'If the pull request modifies CI behaviour, please add the `type/ci` label.',
                'If none of the above applies, please consider removing the backport label and target the next major/minor release.',
                'Thanks!',
            ].join('\n'),
            issue_number: pullRequestNumber,
            owner,
            repo,
        });
        await github.issues.addLabels({
            issue_number: pullRequestNumber,
            labels: [missingLabels],
            owner,
            repo,
        });
        return;
    }
    else if (matches && matchedLabels.length != 0 && labelsString.includes(missingLabels)) {
        await github.issues.removeLabel({
            owner,
            repo,
            issue_number: pullRequestNumber,
            name: missingLabels,
        });
    }
    if (!merged) {
        console.log('PR not merged');
        return;
    }
    console.log('This is a merge action');
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
        // Add the matched backport labels of the main PR
        labelsToAdd.push(...matchedLabels);
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
                    mergedBy: merged_by,
                });
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error while backporting';
                (0, core_1.error)(errorMessage);
                // Create comment
                await github.issues.createComment({
                    body: (0, exports.getFailedBackportCommentBody)({
                        base,
                        commitToBackport,
                        errorMessage,
                        head,
                        title,
                    }),
                    issue_number: pullRequestNumber,
                    owner,
                    repo,
                });
                // Add backport-failed label to failed backports
                await github.issues.addLabels({
                    issue_number: pullRequestNumber,
                    labels: ['backport-failed'],
                    owner,
                    repo,
                });
            }
        });
    }
};
exports.backport = backport;
//# sourceMappingURL=backport.js.map