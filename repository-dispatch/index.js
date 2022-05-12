"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
const core_1 = require("@actions/core");
class RepositoryDispatch extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'RepositoryDispatch';
    }
    async onTriggered(octokit) {
        const repository = (0, core_1.getInput)('repository');
        if (!repository) {
            throw new Error('Missing repository');
        }
        const [owner, repo] = repository.split('/');
        console.log('creating dispatch event', owner, repo);
        const resp = await octokit.octokit.repos.createDispatchEvent({
            owner: owner,
            repo: repo,
            event_type: (0, core_1.getInput)('event_type'),
            client_payload: JSON.parse((0, core_1.getInput)('client_payload')),
        });
        console.log(resp.status);
    }
}
new RepositoryDispatch().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map