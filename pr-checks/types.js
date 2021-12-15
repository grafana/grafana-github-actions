"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckContext = exports.CheckState = void 0;
var CheckState;
(function (CheckState) {
    CheckState["Error"] = "error";
    CheckState["Failure"] = "failure";
    CheckState["Pending"] = "pending";
    CheckState["Success"] = "success";
})(CheckState = exports.CheckState || (exports.CheckState = {}));
class CheckContext {
    constructor(getPullRequestFn, config) {
        this.getPullRequestFn = getPullRequestFn;
        this.config = config;
    }
    getPullRequest() {
        return this.getPullRequestFn();
    }
    getConfig() {
        return this.config;
    }
    getResult() {
        return this.result;
    }
    pending(status) {
        this.result = {
            state: CheckState.Pending,
            ...status,
        };
    }
    failure(status) {
        this.result = {
            state: CheckState.Failure,
            ...status,
        };
    }
    success(status) {
        this.result = {
            state: CheckState.Success,
            ...status,
        };
    }
    error(status) {
        this.result = {
            state: CheckState.Error,
            ...status,
        };
    }
}
exports.CheckContext = CheckContext;
//# sourceMappingURL=types.js.map