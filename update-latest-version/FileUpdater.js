"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUpdater = void 0;
const fs_1 = __importDefault(require("fs"));
const semver_1 = __importDefault(require("semver"));
class FileUpdater {
    constructor() {
        this.fileContent = '';
    }
    loadFile(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File not found ${filePath}`);
        }
        this.fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
    }
    update({ version }) {
        const regex = RegExp(`^[0-9]+.[0-9]+.[0-9]+(?<is_beta>-beta[0-9]+)?$`);
        const match = regex.exec(version);
        if (!match) {
            throw new Error(`Invalid version: ${version}`);
        }
        let c = JSON.parse(this.fileContent);
        if (semver_1.default.lt(version, c.stable)) {
            throw new Error(`Version: ${version} is lower than the existing: ${c.stable}`);
        }
        if (!match?.groups?.is_beta) {
            c.stable = version;
        }
        c.testing = version;
        this.fileContent = JSON.stringify(c);
    }
    writeFile(filePath) {
        fs_1.default.writeFileSync(filePath, this.fileContent, { encoding: 'utf-8' });
    }
    getContent() {
        return this.fileContent;
    }
}
exports.FileUpdater = FileUpdater;
//# sourceMappingURL=FileUpdater.js.map