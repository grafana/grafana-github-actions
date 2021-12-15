"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Check = void 0;
class Check {
    isEnabled(config) {
        if (config[this.id]) {
            return true;
        }
        return false;
    }
}
exports.Check = Check;
//# sourceMappingURL=Check.js.map