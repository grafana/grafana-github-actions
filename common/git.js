"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRepo = exports.setConfig = void 0;
const exec_1 = require("@actions/exec");
const grafanaBotProps = { userEmail: 'bot@grafana.com', userName: 'grafanabot' };
const grafanaDeliveryBotProps = {
    userEmail: '132647405+grafana-delivery-bot[bot]@users.noreply.github.com',
    userName: 'grafana-delivery-bot[bot]',
};
async function setConfig(botSlug) {
    let configProps;
    switch (botSlug) {
        case 'grafanabot':
            configProps = grafanaBotProps;
            break;
        case 'grafana-delivery-bot':
            configProps = grafanaDeliveryBotProps;
            break;
        default:
            throw Error('Users available: grafanabot and grafana-delivery-bot, please add another user if that is the case');
    }
    await (0, exec_1.exec)('git', ['config', '--global', 'user.email', configProps.userEmail]);
    await (0, exec_1.exec)('git', ['config', '--global', 'user.name', configProps.userName]);
}
exports.setConfig = setConfig;
async function cloneRepo({ token, owner, repo }) {
    await (0, exec_1.exec)('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`]);
}
exports.cloneRepo = cloneRepo;
//# sourceMappingURL=git.js.map