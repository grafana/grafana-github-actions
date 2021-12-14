"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
exports.__esModule = true;
var github_1 = require("@actions/github");
var Action_1 = require("../common/Action");
var RemoveMilestone = /** @class */ (function (_super) {
    __extends(RemoveMilestone, _super);
    function RemoveMilestone() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.id = 'RemoveMilestone';
        return _this;
    }
    RemoveMilestone.prototype.onTriggered = function (octokit) {
        return __awaiter(this, void 0, void 0, function () {
            var _a, owner, repo, payload, version, _i, _b, issue;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _a = github_1.context.repo, owner = _a.owner, repo = _a.repo;
                        payload = github_1.context.payload;
                        version = payload.inputs.version;
                        _i = 0;
                        return [4 /*yield*/, getIssuesForVersion(octokit, version)];
                    case 1:
                        _b = _c.sent();
                        _c.label = 2;
                    case 2:
                        if (!(_i < _b.length)) return [3 /*break*/, 4];
                        issue = _b[_i];
                        octokit.octokit.issues.update({
                            owner: owner,
                            repo: repo,
                            issue_number: issue.number,
                            milestone: null
                        });
                        _c.label = 3;
                    case 3:
                        _i++;
                        return [3 /*break*/, 2];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return RemoveMilestone;
}(Action_1.Action));
function getIssuesForVersion(octokit, version) {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function () {
        var issueList, _b, _c, page, _i, page_1, issue, _d, _e, e_1_1;
        return __generator(this, function (_f) {
            switch (_f.label) {
                case 0:
                    issueList = [];
                    _f.label = 1;
                case 1:
                    _f.trys.push([1, 9, 10, 15]);
                    _b = __asyncValues(octokit.query({ q: "is:issue is:open milestone:".concat(version) }));
                    _f.label = 2;
                case 2: return [4 /*yield*/, _b.next()];
                case 3:
                    if (!(_c = _f.sent(), !_c.done)) return [3 /*break*/, 8];
                    page = _c.value;
                    _i = 0, page_1 = page;
                    _f.label = 4;
                case 4:
                    if (!(_i < page_1.length)) return [3 /*break*/, 7];
                    issue = page_1[_i];
                    _e = (_d = issueList).push;
                    return [4 /*yield*/, issue.getIssue()];
                case 5:
                    _e.apply(_d, [_f.sent()]);
                    _f.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7: return [3 /*break*/, 2];
                case 8: return [3 /*break*/, 15];
                case 9:
                    e_1_1 = _f.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 15];
                case 10:
                    _f.trys.push([10, , 13, 14]);
                    if (!(_c && !_c.done && (_a = _b["return"]))) return [3 /*break*/, 12];
                    return [4 /*yield*/, _a.call(_b)];
                case 11:
                    _f.sent();
                    _f.label = 12;
                case 12: return [3 /*break*/, 14];
                case 13:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 14: return [7 /*endfinally*/];
                case 15: return [2 /*return*/, issueList];
            }
        });
    });
}
new RemoveMilestone().run();
