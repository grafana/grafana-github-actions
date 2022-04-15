"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepo = void 0;
const exec_1 = require("@actions/exec");
async function cloneRepo({ token, owner, repo }) {
    await (0, exec_1.exec)('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`]);
    await (0, exec_1.exec)('git', ['config', '--global', 'user.email', 'bot@grafana.com']);
    await (0, exec_1.exec)('git', ['config', '--global', 'user.name', 'grafanabot']);
}
exports.cloneRepo = cloneRepo;
//# sourceMappingURL=git.js.map