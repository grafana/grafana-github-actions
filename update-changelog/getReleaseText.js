"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReleaseText = void 0;
async function getReleaseText(octokit, milestone) {
    const res = '';
    for await (const page of octokit.query({ q: `is:closed milestone:7.3.3 label:"add to changelog"` })) {
        console.log('page', page);
        break;
    }
    return 'asd';
}
exports.getReleaseText = getReleaseText;
//# sourceMappingURL=getReleaseText.js.map