"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiHandle = undefined;
exports.trackEvent = async (issue, event, props) => {
    console.log('tracking event', event, props);
    // if (aiHandle) {
    // 	aiHandle.trackEvent({
    // 		name: event,
    // 		properties: {
    // 			repo: `${context.repo.owner}/${context.repo.repo}`,
    // 			issue: '' + (await issue.getIssue()).number,
    // 			workflow: context.workflow,
    // 			...props,
    // 		},
    // 	})
    // }
};
//# sourceMappingURL=telemetry.js.map