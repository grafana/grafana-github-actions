"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.release = void 0;
const github_1 = require("@actions/github");
const core_1 = require("@actions/core");
const exec_1 = require("@actions/exec");
const lodash_escaperegexp_1 = __importDefault(require("lodash.escaperegexp"));
const FileAppender_1 = require("./FileAppender");
const git_1 = require("../common/git");
const labelMatcher = 'add-to-release-notes';
const createReleaseNotesPR = async ({ pullRequestNumber: prNumber, pullRequestUrl: prUrl, pullRequestTitle: prTitle, releaseNotesFile, github, head, labelsToAdd, owner, repo, title, milestone, mergedBy, }) => {
    const git = async (...args) => {
        await (0, exec_1.exec)('git', args, { cwd: repo });
    };
    await git('checkout', 'main');
    await git('pull');
    await git('switch', '--create', head);
    const fileAppender = new FileAppender_1.FileAppender({ cwd: repo });
    fileAppender.loadFile(releaseNotesFile);
    fileAppender.append(`-  **${prTitle}**: :warning: ADD DESCRIPTION HERE :warning:. [PR #${prNumber}](${prUrl})]`);
    fileAppender.writeFile(releaseNotesFile);
    await git('add', releaseNotesFile);
    const body = 'Add PR #' + prNumber + ' to release notes for next release';
    await git('commit', '-m', body);
    await git('push', '--set-upstream', 'origin', head);
    const createRsp = await github.pulls.create({
        base: 'main',
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
const getFailedPRCommentBody = ({ prNumber, prUrl, prTitle, releaseNotesFile, errorMessage, head, }) => {
    return [
        `Failed to add PR #${prNumber} to the release notes`,
        '```',
        errorMessage,
        '```',
        'To create this PR manually, run these commands in your terminal:',
        '```bash',
        '# Fetch latest updates from GitHub',
        'git fetch',
        '# Create a new branch',
        `git switch --create ${head} origin/main`,
        '# Add the relevant PR to the release notes',
        `echo "* [PR #${prNumber}](${prUrl}) - ${prTitle}" >> ${releaseNotesFile}`,
        `git add ${releaseNotesFile}`,
        `git commit -m "Add PR #${prNumber} to release notes for next release`,
        '# Push it to GitHub',
        `git push --set-upstream origin ${head}`,
        `git switch main`,
        '# Remove the local branch',
        `git branch -D ${head}`,
        '```',
        `Then, create a pull request where the \`base\` branch is \`origin/main\` and the \`compare\`/\`head\` branch is \`${head}\`.`,
    ].join('\n');
};
const release = async ({ labelsToAdd, payload: { pull_request: { labels, merged, number: pullRequestNumber, title: originalTitle, milestone, merged_by, }, repository: { name: repo, owner: { login: owner }, }, }, titleTemplate, releaseNotesFile, token, github, }) => {
    const payload = github_1.context.payload;
    console.log('payloadAction: ' + payload.action);
    let labelsString = labels.map(({ name }) => name);
    let matches = false;
    for (const label of labelsString) {
        matches = labelMatcher === label;
        if (matches) {
            break;
        }
    }
    if (!matches) {
        console.log("PR doesn't contain label " + labelMatcher + '. Not adding to release notes.');
        return;
    }
    if (!merged) {
        console.log('PR not merged');
        return;
    }
    console.log('This is a merge action');
    await (0, git_1.cloneRepo)({ token, owner, repo });
    await (0, git_1.setConfig)('grafanabot');
    await (0, core_1.group)(`Adding ${pullRequestNumber} to release notes for next release`, async () => {
        let head = `add-${pullRequestNumber}-to-release-notes`;
        let title = titleTemplate;
        Object.entries({
            pullRequestNumber: pullRequestNumber.toString(),
            originalTitle,
        }).forEach(([name, value]) => {
            title = title.replace(new RegExp((0, lodash_escaperegexp_1.default)(`{{${name}}}`), 'g'), value);
        });
        try {
            await createReleaseNotesPR({
                pullRequestNumber,
                pullRequestTitle: originalTitle,
                pullRequestUrl: payload.pull_request.html_url,
                releaseNotesFile,
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
                body: getFailedPRCommentBody({
                    prNumber: pullRequestNumber,
                    prUrl: payload.pull_request.html_url,
                    prTitle: originalTitle,
                    releaseNotesFile,
                    errorMessage,
                    head,
                }),
                issue_number: pullRequestNumber,
                owner,
                repo,
            });
            // Add release-notes-failed label to failures
            await github.issues.addLabels({
                issue_number: pullRequestNumber,
                labels: ['release-notes-failed'],
                owner,
                repo,
            });
        }
    });
};
exports.release = release;
//# sourceMappingURL=release.js.map