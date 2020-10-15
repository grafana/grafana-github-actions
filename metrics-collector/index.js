"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const telemetry_1 = require("../common/telemetry");
const github_1 = require("@actions/github");
class MetricsCollector extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'MetricsCollector';
    }
    async onClosed(issue) {
        const issueData = await issue.getIssue();
        const typeLabel = issueData.labels.find((label) => label.startsWith('type/'));
        const labels = {};
        if (typeLabel) {
            labels['type'] = typeLabel.substr(5);
        }
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: 'issue.closed_count',
            value: 1,
            labels,
        });
    }
    async onOpened(_issue) {
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: 'issue.opened_count',
            value: 1,
        });
    }
    async onTriggered(octokit) {
        console.log('context', JSON.stringify(github_1.context.payload, null, 2));
        console.log('repo', JSON.stringify(await octokit.getRepoInfo(), null, 2));
        await this.countQuery('type_bug', 'label:"type/bug" is:open', octokit);
        await this.countQuery('needs_investigation', 'label:"needs investigation" is:open', octokit);
        await this.countQuery('needs_more_info', 'label:"needs more info" is:open', octokit);
        await this.countQuery('unlabeled', 'is:open is:issue no:label', octokit);
        await this.countQuery('open_prs', 'is:open is:pr', octokit);
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