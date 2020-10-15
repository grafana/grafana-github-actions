"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const axios_1 = __importDefault(require("axios"));
const github_1 = require("@actions/github");
exports.aiHandle = undefined;
const apiKey = utils_1.getInput('metricsWriteAPIKey');
if (apiKey) {
    console.log('metrics context', github_1.context.repo);
    exports.aiHandle = {
        trackException: (arg) => {
            console.log('trackException', arg);
        },
        trackMetric: (metric) => {
            var _a;
            console.log(`trackMetric ${metric.name} ${metric.value}`);
            const tags = [];
            if (metric.labels) {
                for (const key of Object.keys(metric.labels)) {
                    const safeKey = key.replace(' ', '_').replace('/', '_');
                    const safeValue = metric.labels[key].replace(' ', '_').replace('/', '_');
                    tags.push(`${safeKey}=${safeValue}`);
                }
            }
            axios_1.default({
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
                        name: `gh_action.${metric.name}`,
                        value: metric.value,
                        interval: 60,
                        mtype: (_a = metric.type) !== null && _a !== void 0 ? _a : 'count',
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
exports.trackEvent = async (issue, event, props) => {
    console.log('tracking event', event, props);
};
//# sourceMappingURL=telemetry.js.map