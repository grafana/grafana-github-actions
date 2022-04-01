"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const utils_1 = require("../common/utils");
const map_1 = require("./map");
try {
    var ref = (0, utils_1.getRequiredInput)('ref_name');
    console.log('Input ref_name: ' + ref);
    let target = (0, map_1.map)(ref);
    console.log('Output target: ' + target);
    (0, core_1.setOutput)('target', target);
}
catch (error) {
    (0, core_1.setFailed)(error);
}
//# sourceMappingURL=index.js.map