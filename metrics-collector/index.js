"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const telemetry_1 = require("../common/telemetry");
class CommandsRunner extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'Commands';
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
    async onOpened(issue) {
        telemetry_1.aiHandle === null || telemetry_1.aiHandle === void 0 ? void 0 : telemetry_1.aiHandle.trackMetric({
            name: 'issue.opened_count',
            value: 1,
        });
    }
}
new CommandsRunner().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map