"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackEvent = exports.aiHandle = void 0;
const utils_1 = require("./utils");
const axios_1 = __importDefault(require("axios"));
const github_1 = require("@actions/github");
exports.aiHandle = undefined;
const apiKey = (0, utils_1.getInput)('metricsWriteAPIKey');
if (apiKey) {
    exports.aiHandle = {
        trackException: (arg) => {
            console.log('trackException', arg);
        },
        trackMetric: (metric) => {
            console.log(`trackMetric ${metric.name} ${metric.value}`);
            const tags = [];
            if (metric.labels) {
                for (const key of Object.keys(metric.labels)) {
                    const safeKey = key.replace(' ', '_').replace('/', '_');
                    const safeValue = metric.labels[key].replace(' ', '_').replace('/', '_');
                    tags.push(`${safeKey}=${safeValue}`);
                }
            }
            (0, axios_1.default)({
                url: 'https://graphite-us-central1.grafana.net/metrics',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                auth: {
                    username: '6371',
                    password: apiKey,
                },
                data: JSON.stringify([
                    {
                        name: `${getMetricsNamePrefix()}.${metric.name}`,
                        value: metric.value,
                        interval: 60,
                        mtype: metric.type ?? 'count',
                        time: Math.floor(new Date().valueOf() / 1000),
                        tags,
                    },
                ]),
            }).catch((e) => {
                console.log(e);
            });
        },
    };
}
function getMetricsNamePrefix() {
    if (!github_1.context || github_1.context.repo.repo === 'grafana') {
        // this is for grafana repo, did not make this multi repo at the start and do not want to lose past metrics
        return 'gh_action';
    }
    return `repo_stats.${github_1.context.repo.repo}`;
}
const trackEvent = async (issue, event, props) => {
    console.debug('tracking event', issue, event, props);
};
exports.trackEvent = trackEvent;
//# sourceMappingURL=telemetry.js.map