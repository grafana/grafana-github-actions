"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const octokit_1 = require("../api/octokit");
const getReleaseText_1 = require("./getReleaseText");
dotenv_1.default.config();
const token = process.env.TOKEN;
const repo = process.env.REPO;
const owner = process.env.OWNER;
const octokit = new octokit_1.OctoKit(token, { repo, owner }, { readonly: false });
async function devTest() {
    const releastText = await getReleaseText_1.getReleaseText(octokit, 204);
    console.log('releaseText', releastText);
}
devTest();
//# sourceMappingURL=devTest.js.map