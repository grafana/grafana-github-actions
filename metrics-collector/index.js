"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const Action_1 = require("../common/Action");
const telemetry_1 = require("../common/telemetry");
class MetricsCollector extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'MetricsCollector';
    }
    async onClosed(issue) {
        const issueData = await issue.getIssue();
        const typeLabel = issueData.labels.find(label => label.startsWith('type/'));
        const labels = {};
        if (typeLabel) {
            labels['type'] = typeLabel.substr(5);
        }
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'issue.closed_count', value: 1, labels });
    }
    async onOpened(_issue) {
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'issue.opened_count', value: 1 });
    }
    async onTriggered(octokit) {
        const repo = await octokit.getRepoInfo();
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'repo.stargazers', value: repo.data.stargazers_count, type: 'gauge' });
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'repo.watchers', value: repo.data.watchers_count, type: 'gauge' });
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'repo.size', value: repo.data.size, type: 'gauge' });
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({ name: 'repo.forks', value: repo.data.forks_count, type: 'gauge' });
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: 'repo.open_issues_count',
            value: repo.data.open_issues_count,
            type: 'gauge',
        });
        const configPath = utils_1.getInput('configPath');
        if (!configPath) {
            return;
        }
        const config = (await octokit.readConfig(configPath));
        for (const query of config.queries) {
            await this.countQuery(query.name, query.query, octokit);
        }
        // await this.countQuery('type_bug', 'label:"type/bug" is:open', octokit)
        // await this.countQuery('needs_investigation', 'label:"needs investigation" is:open', octokit)
        // await this.countQuery('needs_more_info', 'label:"needs more info" is:open', octokit)
        // await this.countQuery('unlabeled', 'is:open is:issue no:label', octokit)
        // await this.countQuery('open_prs', 'is:open is:pr', octokit)
        // await this.countQuery('milestone_7_4_open', 'is:open is:issue milestone:7.4 ', octokit)
    }
    async countQuery(name, query, octokit) {
        let count = 0;
        for await (const page of octokit.query({ q: query })) {
            count += page.length;
        }
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: `issue_query.${name}.gauge`,
            value: count,
            type: 'gauge',
        });
    }
}
new MetricsCollector().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map