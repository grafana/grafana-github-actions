"use strict";
/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../common/utils");
const Commands_1 = require("./Commands");
const Action_1 = require("../common/Action");
const github_1 = require("@actions/github");
class CommandsRunner extends Action_1.Action {
    constructor() {
        super(...arguments);
        this.id = 'Commands';
    }
    async onCommented(issue, comment, actor) {
        const commands = await issue.readConfig(utils_1.getRequiredInput('configPath'));
        await new Commands_1.Commands(issue, commands, { comment, user: { name: actor } }).run();
    }
    async onLabeled(issue, label) {
        const commands = await issue.readConfig(utils_1.getRequiredInput('configPath'));
        await new Commands_1.Commands(issue, commands, { label }).run();
    }
    async onOpened(issue) {
        const commands = await issue.readConfig(utils_1.getRequiredInput('configPath'));
        const payload = github_1.context.payload;
        await new Commands_1.Commands(issue, commands, {}).run();
    }
    async onSynchronized(issue) {
        const commands = await issue.readConfig(utils_1.getRequiredInput('configPath'));
        const payload = github_1.context.payload;
        await new Commands_1.Commands(issue, commands, {}).run();
    }
}
new CommandsRunner().run(); // eslint-disable-line
//# sourceMappingURL=index.js.map