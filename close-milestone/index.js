"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
class CloseMilestone extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'CloseMilestone';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const version = this.getVersion();
        // get all the milestones
        const milestones = await octokit.octokit.issues.listMilestonesForRepo({
            owner,
            repo,
            state: 'open',
        });
        for (const milestone of milestones.data) {
            if (milestone.title === version) {
                await octokit.octokit.issues.updateMilestone({
                    owner,
                    repo,
                    milestone_number: milestone.number,
                    state: 'closed',
                    description: `${milestone.description}\n Closed by github action`,
                });
                return;
            }
        }
        throw new Error('Could not find milestone');
    }
}
new CloseMilestone().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map