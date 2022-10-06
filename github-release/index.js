"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const github_1 = require("@actions/github");
const Action_1 = require("../common/Action");
const utils_1 = require("../common/utils");
const request_error_1 = require("@octokit/request-error");
const ChangelogBuilder_1 = require("../update-changelog/ChangelogBuilder");
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
        const builder = new ChangelogBuilder_1.ChangelogBuilder(octokit, version);
        const tag = `v${version}`;
        const notes = await builder.buildChangelog({ noHeader: true });
        const title = builder.getTitle();
        const content = `
[Download page](https://grafana.com/grafana/download/${version})
[What's new highlights](https://grafana.com/docs/grafana/latest/whatsnew/)


${notes}
`;
        try {
            const existingRelease = await octokit.octokit.repos.getReleaseByTag({
                repo,
                owner,
                tag,
            });
            console.log('Updating github release');
            await octokit.octokit.repos.updateRelease({
                draft: existingRelease.data.draft,
                release_id: existingRelease.data.id,
                repo,
                owner,
                name: title,
                body: content,
                tag_name: tag,
            });
        }
        catch (err) {
            if (err instanceof request_error_1.RequestError && err.status !== 404) {
                console.log('getReleaseByTag error', err);
            }
            console.log('Creating github release');
            await octokit.octokit.repos.createRelease({
                repo,
                owner,
                name: title,
                body: content,
                tag_name: tag,
                prerelease: (0, utils_1.isPreRelease)(tag),
            });
        }
    }
}
new GitHubRelease().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map