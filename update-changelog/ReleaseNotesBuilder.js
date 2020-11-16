"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReleaseNotesBuilder = exports.BREAKING_SECTION_START = exports.BREAKING_CHANGE_LABEL = exports.GRAFANA_UI_LABEL = exports.GRAFANA_TOOLKIT_LABEL = exports.CHANGELOG_LABEL = void 0;
const lodash_1 = require("lodash");
const utils_1 = require("../common/utils");
exports.CHANGELOG_LABEL = 'add to changelog';
exports.GRAFANA_TOOLKIT_LABEL = 'area/grafana/toolkit';
exports.GRAFANA_UI_LABEL = 'area/grafana/ui';
exports.BREAKING_CHANGE_LABEL = 'breaking change';
exports.BREAKING_SECTION_START = 'Release notice breaking change';
const githubGrafanaUrl = 'https://github.com/grafana/grafana';
class ReleaseNotesBuilder {
    constructor(octokit) {
        this.octokit = octokit;
    }
    async buildReleaseNotes(milestone) {
        const lines = [];
        const grafanaIssues = [];
        const pluginDeveloperIssues = [];
        const breakingChanges = [];
        for await (const page of this.octokit.query({ q: `is:closed milestone:${milestone}` })) {
            for (const issue of page) {
                const issueData = await issue.getIssue();
                if (issueHasLabel(issueData, exports.CHANGELOG_LABEL)) {
                    if (issueHasLabel(issueData, exports.GRAFANA_TOOLKIT_LABEL) ||
                        issueHasLabel(issueData, exports.GRAFANA_UI_LABEL)) {
                        pluginDeveloperIssues.push(issueData);
                    }
                    else {
                        grafanaIssues.push(issueData);
                    }
                    if (issueHasLabel(issueData, exports.BREAKING_CHANGE_LABEL)) {
                        breakingChanges.push(...this.getBreakingChangeNotice(issueData));
                    }
                }
            }
        }
        lines.push(...this.getGrafanaReleaseNotes(grafanaIssues));
        if (breakingChanges.length > 0) {
            lines.push('### Breaking changes');
            lines.push('');
            lines.push(...breakingChanges);
        }
        lines.push(...this.getPluginDevelopmentNotes(pluginDeveloperIssues));
        return lines.join('\n');
    }
    getBreakingChangeNotice(issue) {
        const noticeLines = [];
        let startFound = false;
        for (const line of utils_1.splitStringIntoLines(issue.body)) {
            if (startFound) {
                noticeLines.push(line);
            }
            if (line.indexOf(exports.BREAKING_SECTION_START) >= 0) {
                startFound = true;
            }
        }
        if (noticeLines.length > 0) {
            const lastLineIdx = noticeLines.length - 1;
            noticeLines[lastLineIdx] = noticeLines[lastLineIdx] + ` Issue ${linkToIssue(issue)}`;
            noticeLines.push('');
        }
        return noticeLines;
    }
    getPluginDevelopmentNotes(issues) {
        if (issues.length === 0) {
            return [];
        }
        const lines = ['### Plugin development fixes & changes', ''];
        for (const issue of issues) {
            lines.push(this.getMarkdownLineForIssue(issue));
        }
        lines.push('');
        return lines;
    }
    getGrafanaReleaseNotes(issues) {
        if (issues.length === 0) {
            return [];
        }
        const lines = [];
        const bugs = lodash_1.sortBy(issues.filter(isBugFix), 'title');
        const notBugs = lodash_1.sortBy(lodash_1.difference(issues, bugs), 'title');
        if (notBugs.length > 0) {
            lines.push('### Features / Enhancements');
            lines.push('');
            for (const item of notBugs) {
                lines.push(this.getMarkdownLineForIssue(item));
            }
            lines.push('');
        }
        if (bugs.length > 0) {
            lines.push('### Bug Fixes');
            lines.push('');
            for (const item of bugs) {
                lines.push(this.getMarkdownLineForIssue(item));
            }
            lines.push('');
        }
        return lines;
    }
    getMarkdownLineForIssue(item) {
        let markdown = '';
        let title = item.title.replace(/^([^:]*)/, (_match, g1) => {
            return `**${g1}**`;
        });
        title = title.trim();
        if (title[title.length - 1] === '.') {
            title = title.slice(0, -1);
        }
        if (item.isPullRequest) {
            markdown += '* ' + title + '.';
            markdown += ` [#${item.number}](${githubGrafanaUrl}/pull/${item.number})`;
            markdown += `, [@${item.author.name}](https://github.com/${item.author.name})`;
        }
        else {
            markdown += '* ' + title + '.';
            markdown += ` ${linkToIssue(item)}`;
        }
        return markdown;
    }
}
exports.ReleaseNotesBuilder = ReleaseNotesBuilder;
function linkToIssue(item) {
    return `[#${item.number}](${githubGrafanaUrl}/issues/${item.number})`;
}
function issueHasLabel(issue, label) {
    return issue.labels && issue.labels.indexOf(label) !== -1;
}
function isBugFix(item) {
    if (item.title.match(/fix|fixes/i)) {
        return true;
    }
    if (item.labels.find((label) => label.name === 'type/bug')) {
        return true;
    }
    return false;
}
//# sourceMappingURL=ReleaseNotesBuilder.js.map