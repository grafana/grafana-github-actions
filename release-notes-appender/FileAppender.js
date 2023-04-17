"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileAppender = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const utils_1 = require("../common/utils");
class FileAppender {
    constructor(opts = {}) {
        this.lines = [];
        this.options = {};
        this.options = opts;
    }
    loadFile(relPath) {
        let filePath = this.options.cwd ? path_1.default.resolve(this.options.cwd, relPath) : relPath;
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File not found ${filePath}`);
        }
        const fileContent = fs_1.default.readFileSync(filePath, 'utf-8');
        this.lines = (0, utils_1.splitStringIntoLines)(fileContent);
    }
    append(content) {
        this.lines.push(content);
    }
    writeFile(relPath) {
        let filePath = this.options.cwd ? path_1.default.resolve(this.options.cwd, relPath) : relPath;
        fs_1.default.writeFileSync(filePath, this.getContent(), { encoding: 'utf-8' });
    }
    getContent() {
        return this.lines.join('\r\n');
    }
}
exports.FileAppender = FileAppender;
//# sourceMappingURL=FileAppender.js.map