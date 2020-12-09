"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action_1 = require("../common/Action");
class PRCheck extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'PRCheck';
    }
    async onLabeled(issue, label) { }
    async onMilestoned(issue) { }
    async onOpened(issue) { }
}
new PRCheck().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map