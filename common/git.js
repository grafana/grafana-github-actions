"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exec_1 = require("@actions/exec");
async function cloneRepo({ token, owner, repo }) {
    await exec_1.exec('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`]);
    await exec_1.exec('git', ['config', '--global', 'user.email', 'github-actions[bot]@users.noreply.github.com']);
    await exec_1.exec('git', ['config', '--global', 'user.name', 'github-actions[bot]']);
}
exports.cloneRepo = cloneRepo;
//# sourceMappingURL=git.js.map