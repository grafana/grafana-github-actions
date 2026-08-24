"use strict";
// Based on code from https://github.com/tibdex/backport/blob/master/src/backport.ts
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backport = exports.getFinalLabels = exports.getFailedBackportCommentBody = exports.isBettererConflict = exports.LABEL_NO_CHANGELOG = exports.LABEL_ADD_TO_CHANGELOG = exports.BETTERER_RESULTS_PATH = exports.buildFileChanges = void 0;
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const github_1 = require("@actions/github");
const betterer_1 = require("@betterer/betterer");
const graphql_1 = require("@octokit/graphql");
const fs_1 = require("fs");
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const path_1 = __importDefault(require("path"));
const git_1 = require("../common/git");
// Build the FileChanges payload for createCommitOnBranch from the diff between two refs in a
// local git checkout. Renames are not represented separately by createCommitOnBranch, so we
// pass --no-renames to git and let renamed files appear as a deletion + addition.
async function buildFileChanges(repoDir, fromRef, toRef) {
    const { stdout } = await (0, exec_1.getExecOutput)('git', ['diff', '--no-renames', '--name-status', '-z', fromRef, toRef], { cwd: repoDir, silent: true });
    const additions = [];
    const deletions = [];
    // `git diff -z --name-status` emits NUL-separated tokens, alternating "<status>" and
    // "<path>". With --no-renames there are no rename/copy triples to worry about.
    const tokens = stdout.split('\0').filter((t) => t.length > 0);
    for (let i = 0; i + 1 < tokens.length; i += 2) {
        const status = tokens[i][0];
        const filePath = tokens[i + 1];
        if (status === 'D') {
            deletions.push({ path: filePath });
        }
        else {
            // A (added), M (modified), T (type change) — read the new content.
            const buf = await fs_1.promises.readFile(path_1.default.join(repoDir, filePath));
            additions.push({ path: filePath, contents: buf.toString('base64') });
        }
    }
    return { additions, deletions };
}
exports.buildFileChanges = buildFileChanges;
const createCommitOnBranchMutation = `
  mutation(
    $repo: String!
    $branch: String!
    $oid: GitObjectID!
    $message: String!
    $additions: [FileAddition!]
    $deletions: [FileDeletion!]
  ) {
    createCommitOnBranch(
      input: {
        branch: { repositoryNameWithOwner: $repo, branchName: $branch }
        expectedHeadOid: $oid
        fileChanges: { additions: $additions, deletions: $deletions }
        message: { headline: $message }
      }
    ) {
      commit { url oid }
    }
  }
`;
exports.BETTERER_RESULTS_PATH = '.betterer.results';
exports.LABEL_ADD_TO_CHANGELOG = 'add to changelog';
exports.LABEL_NO_CHANGELOG = 'no-changelog';
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
    return gitUnmergedPaths.length === 1 && gitUnmergedPaths[0] === exports.BETTERER_RESULTS_PATH;
};
exports.isBettererConflict = isBettererConflict;
const backportOnce = async ({ base, body, commitToBackport, github, head, labelsToAdd, removeDefaultReviewers, owner, repo, title, mergedBy, token, }) => {
    const git = async (...args) => {
        await (0, exec_1.exec)('git', args, { cwd: repo });
    };
    const gitOutput = async (...args) => {
        const { stdout } = await (0, exec_1.getExecOutput)('git', args, { cwd: repo, silent: true });
        return stdout.trim();
    };
    const gitDiffUnmergedPaths = async () => {
        const { stdout } = await (0, exec_1.getExecOutput)('git', ['diff', '--name-only', '--diff-filter=U'], {
            cwd: repo,
        });
        return stdout.trim().split(/\r?\n/);
    };
    const fixBettererConflict = async () => {
        await (0, betterer_1.betterer)({ update: true, cwd: repo });
        await git('add', exports.BETTERER_RESULTS_PATH);
        // Setting -c core.editor=true will prevent the commit message editor from opening
        await git('-c', 'core.editor=true', 'cherry-pick', '--continue');
    };
    await git('switch', base);
    const baseSha = await gitOutput('rev-parse', 'HEAD');
    await git('switch', '--create', head);
    try {
        await git('cherry-pick', '-x', commitToBackport);
    }
    catch (error) {
        const gitUnmergedPaths = await gitDiffUnmergedPaths();
        if (await (0, exports.isBettererConflict)(gitUnmergedPaths)) {
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
    // Publish the cherry-picked commit via the GraphQL createCommitOnBranch mutation so that the
    // resulting commit is signed by GitHub's web-flow key (shows as Verified) instead of an
    // unsigned `git push`. The original author is preserved via a Co-authored-by trailer, since
    // the API uses the authenticated identity (typically a GitHub App) as the author/committer.
    const fileChanges = await buildFileChanges(repo, baseSha, 'HEAD');
    const commitMessage = await gitOutput('log', '-1', '--format=%B', 'HEAD');
    const originalAuthorName = await gitOutput('log', '-1', '--format=%an', commitToBackport);
    const originalAuthorEmail = await gitOutput('log', '-1', '--format=%ae', commitToBackport);
    const message = commitMessage.replace(/\s+$/, '') +
        `\n\nCo-authored-by: ${originalAuthorName} <${originalAuthorEmail}>`;
    await github.git.createRef({ owner, repo, ref: `refs/heads/${head}`, sha: baseSha });
    const authedGraphQL = graphql_1.graphql.defaults({ headers: { authorization: `token ${token}` } });
    await authedGraphQL(createCommitOnBranchMutation, {
        repo: `${owner}/${repo}`,
        branch: head,
        oid: baseSha,
        message,
        additions: fileChanges.additions,
        deletions: fileChanges.deletions,
    });
    const createRsp = await github.pulls.create({
        base,
        body,
        head,
        owner,
        repo,
        title,
    });
    const pullRequestNumber = createRsp.data.number;
    // Set the milestone first in order to avoid failing milestone checks (where possible):
    if (/^v\d+\.\d+\.x$/.test(base)) {
        const milestoneName = base.substring(1);
        const allMilestones = await github.issues.listMilestonesForRepo({ owner, repo, state: 'open' });
        const milestone = allMilestones.data.find((milestone) => milestone.title === milestoneName);
        if (milestone) {
            await github.issues.update({
                repo,
                owner,
                issue_number: pullRequestNumber,
                milestone: milestone.number,
            });
        }
        else {
            console.log('No matching milestone found. Manual assignment necessary.');
        }
    }
    if (labelsToAdd.length > 0) {
        await github.issues.addLabels({
            issue_number: pullRequestNumber,
            labels: labelsToAdd,
            owner,
            repo,
        });
    }
    // Remove default reviewers
    if (removeDefaultReviewers && createRsp.data.requested_reviewers) {
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
};
const getFailedBackportCommentBody = ({ base, commitToBackport, errorMessage, head, title, originalNumber, labels, hasBody, }) => {
    const backportMilestone = base.startsWith('v') ? base.substring(1) : base;
    const escapedTitle = title.replaceAll('"', '\\"');
    const baseBody = `Backport ${commitToBackport} from #${originalNumber}`;
    const joinedLabels = labels.map((l) => `--label '${l}'`).join(' ');
    let lines = [
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
        '```',
        'When the conflicts are resolved, stage and commit the changes:',
        '```',
        'git add . && git cherry-pick --continue',
        '```',
        'If you have the [GitHub CLI](https://cli.github.com/) installed:',
        '```bash',
    ];
    if (hasBody) {
        lines = lines.concat([
            '# Push the branch to GitHub:',
            `git push --set-upstream origin ${head}`,
            '# Create the PR body template',
            `PR_BODY=$(gh pr view ${originalNumber} --json body --template 'Backport ${commitToBackport} from #${originalNumber}{{ "\\n\\n---\\n\\n" }}{{ index . "body" }}')`,
            `# Create the PR on GitHub`,
            `echo "$\{PR_BODY\}" | gh pr create --title '${escapedTitle}' --body-file - ${joinedLabels} --base ${base} --milestone ${backportMilestone} --web`, //eslint-disable-line
        ]);
    }
    else {
        lines = lines.concat([
            '# Push the branch to GitHub:',
            `git push --set-upstream origin ${head}`,
            `# Create the PR on GitHub`,
            `gh pr create --title '${escapedTitle}' --body '${baseBody}' ${joinedLabels} --base ${base} --milestone ${backportMilestone} --web`,
        ]);
    }
    lines = lines.concat([
        '```',
        `Or, if you don't have the GitHub CLI installed ([we recommend you install it!](https://github.com/cli/cli#installation)):`,
        '```bash',
        '# Push the branch to GitHub:',
        `git push --set-upstream origin ${head}`,
        '',
        `# Create a pull request where the \`base\` branch is \`${base}\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
        '',
        '# Remove the local backport branch',
        `git switch main`,
        `git branch -D ${head}`,
        '```',
    ]);
    return lines.join('\n');
};
exports.getFailedBackportCommentBody = getFailedBackportCommentBody;
const backport = async ({ issue, labelsToAdd, payload: { action, label, pull_request: { labels, merge_commit_sha: mergeCommitSha, merged, number: pullRequestNumber, title: originalTitle, merged_by, }, repository: { name: repo, owner: { login: owner }, }, }, titleTemplate, removeDefaultReviewers, token, github, sender, }) => {
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
    // don't execute the rest of the backport if there's no backport label present
    if (!matches) {
        return;
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
    const ghIssue = await issue.getIssue();
    if (!merged) {
        console.log('PR not merged');
        for await (const cmt of issue.getComments()) {
            if (cmt.at.toString().indexOf('This PR must be merged before a backport PR will be created.') >= 0) {
                return;
            }
        }
        await github.issues.createComment({
            body: 'This PR must be merged before a backport PR will be created.',
            issue_number: pullRequestNumber,
            owner,
            repo,
        });
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
    const originalLabels = ghIssue.labels;
    const prLabels = Array.from(getFinalLabels(originalLabels, labelsToAdd).values());
    await (0, git_1.cloneRepo)({ token, owner, repo });
    await (0, git_1.setConfig)('grafana-delivery-bot');
    for (const [base, head] of Object.entries(backportBaseToHead)) {
        const issueHasBody = !!ghIssue.body;
        const bodySuffix = issueHasBody ? `\n\n---\n\n${ghIssue.body}` : '';
        const body = `Backport ${commitToBackport} from #${pullRequestNumber}${bodySuffix}`;
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
                    labelsToAdd: prLabels,
                    removeDefaultReviewers,
                    owner,
                    repo,
                    title,
                    mergedBy: merged_by,
                    token,
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
                        originalNumber: pullRequestNumber,
                        labels: prLabels,
                        hasBody: issueHasBody,
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
/**
 * getFinalLabels provides the final list of labels that should be set for the
 * new pull-request.
 *
 * @param originalLabels labels provided by the original pull request
 * @param labelsToAdd labels requested to be added by configuration
 */
function getFinalLabels(originalLabels, labelsToAdd) {
    const result = new Set(originalLabels);
    // Remove all the labels that started with `backport .*`
    for (const label of originalLabels) {
        if (label === 'backport-failed' || labelRegExp.test(label)) {
            result.delete(label);
        }
    }
    for (const label of labelsToAdd) {
        result.add(label);
        switch (label) {
            case exports.LABEL_ADD_TO_CHANGELOG:
                result.delete(exports.LABEL_NO_CHANGELOG);
                break;
            case exports.LABEL_NO_CHANGELOG:
                result.delete(exports.LABEL_ADD_TO_CHANGELOG);
                break;
        }
    }
    return result;
}
exports.getFinalLabels = getFinalLabels;
//# sourceMappingURL=backport.js.map