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
    constructor(api) {
        this.api = api;
    }
    getAPI() {
        return this.api;
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
    reset() {
        this.result = undefined;
    }
}
exports.CheckContext = CheckContext;
//# sourceMappingURL=types.js.map