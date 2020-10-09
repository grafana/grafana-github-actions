"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
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
        await this.count('type/bug', octokit);
        await this.count('needs more info', octokit);
        await this.count('needs investigation', octokit);
        await this.countUnlabeled(octokit);
    }
    async count(label, octokit) {
        const query = `label:"${label}" is:open`;
        let count = 0;
        for await (const page of octokit.query({ q: query })) {
            count += page.length;
        }
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: `issue.open_issues_by_label`,
            value: count,
            labels: {
                label: `${label}`,
            },
        });
    }
    async countUnlabeled(octokit) {
        const query = `is:open is:issue no:label`;
        let count = 0;
        for await (const page of octokit.query({ q: query })) {
            count += page.length;
        }
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: `issue.open_issues_without_label`,
            value: count,
        });
    }
}
new MetricsCollector().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map