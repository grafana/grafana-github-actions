"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const ReleaseNotesBuilder_1 = require("../update-changelog/ReleaseNotesBuilder");
class GitHubRelease extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'GitHubRelease';
    }
    async onTriggered(octokit) {
        const { owner, repo } = github_1.context.repo;
        const payload = github_1.context.payload;
        const version = payload.inputs.version;
        if (!version) {
            throw new Error('Missing version input');
        }
        const builder = new ReleaseNotesBuilder_1.ReleaseNotesBuilder(octokit, version);
        const tag = `v${version}`;
        const notes = builder.buildReleaseNotes({ noHeader: true });
        const title = builder.getTitle();
        const content = `
[Download page](https://grafana.com/grafana/download/${version})
[What's new highlights](https://grafana.com/docs/grafana/latest/whatsnew/)


${notes}
`;
        const existingRelease = await octokit.octokit.repos.getReleaseByTag({
            repo,
            owner,
            tag,
        });
        // if we have an existing reelase update it
        if (existingRelease.status === 200 && existingRelease.data) {
            console.log('Updating github release');
            octokit.octokit.repos.updateRelease({
                release_id: existingRelease.data.id,
                repo,
                owner,
                name: title,
                body: content,
                tag_name: tag,
            });
        }
        else {
            console.log('Creating github release');
            octokit.octokit.repos.createRelease({
                repo,
                owner,
                name: title,
                body: content,
                tag_name: tag,
            });
        }
    }
}
new GitHubRelease().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map