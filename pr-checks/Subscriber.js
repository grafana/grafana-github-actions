"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Subscriber = void 0;
class Subscriber {
    constructor() {
        this.subcriptions = [];
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
        this.subcriptions.push({
            events,
            actions,
            callback,
        });
    }
    subscriptions() {
        return this.subcriptions;
    }
    subscriptionsByEventAction(event, action) {
        return this.subcriptions.filter((s) => {
            return (s.events.includes(event) && (s.actions.length === 0 || (action && s.actions.includes(action))));
        });
    }
}
exports.Subscriber = Subscriber;
//# sourceMappingURL=Subscriber.js.map