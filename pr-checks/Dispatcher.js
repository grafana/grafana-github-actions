"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Dispatcher = void 0;
const types_1 = require("./types");
class Dispatcher {
    constructor(api, subscriber) {
        this.api = api;
        this.subscriber = subscriber;
    }
    on(...args) {
        this.subscriber.on(...args);
    }
    async dispatch(context) {
        console.debug('dispatch based on', {
            eventName: context.eventName,
            action: context.payload?.action,
        });
        const matches = this.subscriber.subscriptionsByEventAction(context?.eventName, context?.payload?.action);
        console.debug('got matches', matches);
        for (let n = 0; n < matches.length; n++) {
            const match = matches[n];
            let ctx = new types_1.CheckContext(this.api);
            try {
                console.debug('calling subcriber of event(s) and action(s)', match.events, match.actions);
                await match.callback(ctx);
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