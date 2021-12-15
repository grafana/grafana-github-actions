"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dispatcher = void 0;
const types_1 = require("./types");
class Dispatcher {
    constructor(api) {
        this.api = api;
        this.subscribers = [];
    }
    on(...args) {
        const eventsArg = args[0];
        let actionsArg = '';
        let callback;
        if (args.length > 2) {
            actionsArg = args[1];
            callback = args[2];
        }
        else {
            callback = args[1];
        }
        let events = [];
        let actions = [];
        if (typeof eventsArg === 'string') {
            events = [eventsArg];
        }
        else if (Array.isArray(eventsArg)) {
            events = eventsArg;
        }
        if (typeof actionsArg === 'string' && actionsArg.length > 0) {
            actions = [actionsArg];
        }
        else if (Array.isArray(actionsArg)) {
            actions = actionsArg;
        }
        this.subscribers.push({
            events,
            actions,
            callback,
        });
    }
    async dispatch(context) {
        const callbacks = this.subscribers
            .filter((s) => {
            return (s.events.includes(context.eventName) &&
                (s.actions.length === 0 || s.actions.includes(context.action)));
        })
            .map((s) => s.callback);
        for (let n = 0; n < callbacks.length; n++) {
            const callback = callbacks[n];
            let ctx = new types_1.CheckContext(this.api?.getPullRequest);
            try {
                await callback(ctx);
                const result = ctx.getResult();
                if (!result) {
                    continue;
                }
                console.debug('got check result', result);
                await this.api.createStatus(result.sha, result.title, result.state, result.description, result.targetURL);
            }
            catch (e) {
                console.error('failed to dispatch', e);
            }
        }
    }
}
exports.Dispatcher = Dispatcher;
//# sourceMappingURL=Dispatcher.js.map