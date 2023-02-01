"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChangelogBuilder = exports.ENTERPRISE_LABEL = exports.DEPRECATION_SECTION_START = exports.BREAKING_SECTION_START = exports.GRAFANA_RUNTIME_LABEL = exports.GRAFANA_UI_LABEL = exports.GRAFANA_TOOLKIT_LABEL = exports.BUG_LABEL = exports.CHANGELOG_LABEL = void 0;
const lodash_1 = require("lodash");
const utils_1 = require("../common/utils");
exports.CHANGELOG_LABEL = 'add to changelog';
exports.BUG_LABEL = 'type/bug';
exports.GRAFANA_TOOLKIT_LABEL = 'area/grafana/toolkit';
exports.GRAFANA_UI_LABEL = 'area/grafana/ui';
exports.GRAFANA_RUNTIME_LABEL = 'area/grafana/runtime';
exports.BREAKING_SECTION_START = 'Release notice breaking change';
exports.DEPRECATION_SECTION_START = 'Deprecation notice';
exports.ENTERPRISE_LABEL = 'enterprise';
const githubGrafanaUrl = 'https://github.com/grafana/grafana';
class ChangelogBuilder {
    constructor(octokit, version) {
        this.octokit = octokit;
        this.version = version;
    }
    async buildChangelog(options) {
        const lines = [];
        const grafanaIssues = [];
        const pluginDeveloperIssues = [];
        const breakingChanges = [];
        const deprecationChanges = [];
        let headerLine = null;
        for (const issue of await this.getIssuesForVersion()) {
            if (issueHasLabel(issue, exports.GRAFANA_TOOLKIT_LABEL, exports.GRAFANA_UI_LABEL, exports.GRAFANA_RUNTIME_LABEL)) {
                pluginDeveloperIssues.push(issue);
            }
            else {
                grafanaIssues.push(issue);
            }
            breakingChanges.push(...this.getChangeLogNotice(issue, exports.BREAKING_SECTION_START));
            deprecationChanges.push(...this.getChangeLogNotice(issue, exports.DEPRECATION_SECTION_START));
            if (!headerLine) {
                headerLine = await this.getReleaseHeader(issue.milestoneId, options.useDocsHeader);
            }
        }
        if (headerLine && !options.noHeader) {
            lines.push(headerLine);
            lines.push('');
        }
        lines.push(...this.getGrafanaChangelog(grafanaIssues));
        if (breakingChanges.length > 0) {
            lines.push('### Breaking changes');
            lines.push('');
            lines.push(...breakingChanges);
        }
        if (deprecationChanges.length > 0) {
            lines.push('### Deprecations');
            lines.push('');
            lines.push(...deprecationChanges);
        }
        lines.push(...this.getPluginDevelopmentNotes(pluginDeveloperIssues));
        return lines.join('\n');
    }
    async getIssuesForVersion() {
        if (this.issueList) {
            return this.issueList;
        }
        this.issueList = [];
        for await (const page of this.octokit.query({
            q: `label:"add to changelog" is:pull-request is:closed milestone:${this.version}`,
        })) {
            for (const issue of page) {
                this.issueList.push(await issue.getIssue());
            }
        }
        for await (const page of this.octokit.query({
            q: `label:"add to changelog" is:pull-request is:closed milestone:${this.version}`,
            repo: 'grafana-enterprise',
        })) {
            for (const issue of page) {
                const issueData = await issue.getIssue();
                issueData.labels = [...issueData.labels, exports.ENTERPRISE_LABEL];
                this.issueList.push(issueData);
            }
        }
        return this.issueList;
    }
    async getReleaseHeader(milestoneNumber, useDocsHeader) {
        const milestone = await this.octokit.getMilestone(milestoneNumber);
        let datePart = '';
        if (milestone.closed_at) {
            datePart = ` (${milestone.closed_at.split('T')[0]})`;
        }
        else {
            datePart = ' (unreleased)';
        }
        // Need to store title so we can get this seperatly for the release notes docs file
        if (useDocsHeader) {
            this.title = `Release notes for Grafana ${this.version}`;
        }
        else {
            this.title = `${this.version}${datePart}`;
        }
        return `# ${this.title}`;
    }
    getTitle() {
        return this.title;
    }
    getChangeLogNotice(issue, sectionMarker) {
        const noticeLines = [];
        let startFound = false;
        if (issue.body) {
            for (const line of (0, utils_1.splitStringIntoLines)(issue.body)) {
                if (startFound) {
                    noticeLines.push(line);
                }
                if (line.indexOf(sectionMarker) >= 0) {
                    startFound = true;
                }
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
    getGrafanaChangelog(issues) {
        if (issues.length === 0) {
            return [];
        }
        const lines = [];
        const bugs = (0, lodash_1.sortBy)(issues.filter(isBugFix), 'title');
        const notBugs = (0, lodash_1.sortBy)((0, lodash_1.difference)(issues, bugs), 'title');
        if (notBugs.length > 0) {
            lines.push('### Features and enhancements');
            lines.push('');
            for (const item of notBugs) {
                lines.push(this.getMarkdownLineForIssue(item));
            }
            lines.push('');
        }
        if (bugs.length > 0) {
            lines.push('### Bug fixes');
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
        let title = item.title.replace(/^([^:]*:)/, (_match, g1) => {
            return `**${g1}**`;
        });
        title = title.trim();
        if (title[title.length - 1] === '.') {
            title = title.slice(0, -1);
        }
        if (issueHasLabel(item, exports.ENTERPRISE_LABEL)) {
            markdown += `- ${title}. (Enterprise)`;
            return markdown;
        }
        if (item.isPullRequest) {
            markdown += '- ' + title + '.';
            markdown += ` [#${item.number}](${githubGrafanaUrl}/pull/${item.number})`;
            markdown += `, [@${item.author.name}](https://github.com/${item.author.name})`;
        }
        else {
            markdown += '- ' + title + '.';
            markdown += ` ${linkToIssue(item)}`;
        }
        return markdown;
    }
}
exports.ChangelogBuilder = ChangelogBuilder;
function linkToIssue(item) {
    return `[#${item.number}](${githubGrafanaUrl}/issues/${item.number})`;
}
function issueHasLabel(issue, ...labels) {
    return labels.find((label) => issue.labels && issue.labels.indexOf(label) !== -1);
}
function isBugFix(item) {
    if (item.title.match(/fix|fixes/i)) {
        return true;
    }
    if (item.labels.find((label) => label === exports.BUG_LABEL)) {
        return true;
    }
    return false;
}
//# sourceMappingURL=ChangelogBuilder.js.map