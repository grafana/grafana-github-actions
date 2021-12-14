"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const Action_1 = require("../common/Action");
const Checks_1 = require("./Checks");
class PRChecksAction extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'PR Checks';
    }
    async onOpened(issue) {
        await this.onAction(issue);
    }
    async onMilestoned(issue) {
        await this.onAction(issue);
    }
    async onDemilestoned(issue) {
        await this.onAction(issue);
    }
    async onSynchronized(issue) {
        await this.onAction(issue);
    }
    async onAction(issue) {
        const config = await issue.readConfig((0, utils_1.getRequiredInput)('configPath'));
        await new Checks_1.Checks(issue, config).run();
    }
}
new PRChecksAction().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map