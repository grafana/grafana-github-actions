"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const octokit_1 = require("../api/octokit");
const core_1 = require("@actions/core");
class RepositoryDispatch extends Action_1.Action {
    constructor() {
        const token = (0, core_1.getInput)('token');
        const eventType = (0, core_1.getInput)('event_type');
        if (!token && eventType === 'oss-pull-request') {
            console.log("Token is empty, can't dispatch event. This is expected for PRs coming from forks, please check that the changes are compatible with Enterprise before merging this PR.");
        }
        super();
        this.id = 'RepositoryDispatch';
    }
    async runAction() {
        const repository = (0, core_1.getInput)('repository');
        if (!repository) {
            throw new Error('Missing repository');
        }
        const api = new octokit_1.OctoKit(this.getToken(), github_1.context.repo);
        const [owner, repo] = repository.split('/');
        await api.octokit.repos.createDispatchEvent({
            owner: owner,
            repo: repo,
            event_type: (0, core_1.getInput)('event_type'),
            client_payload: JSON.parse((0, core_1.getInput)('client_payload')),
        });
    }
}
new RepositoryDispatch().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map