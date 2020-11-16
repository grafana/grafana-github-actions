"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUpdater = void 0;
const fs_1 = __importDefault(require("fs"));
class FileUpdater {
    constructor() {
        this.lines = [];
    }
    loadFile(filePath) {
        if (!fs_1.default.existsSync(filePath)) {
            throw new Error(`File not found ${filePath}`);
        }
        const fileContent = require('fs').readFileSync(filePath, 'utf-8');
        this.lines = splitStringIntoLines(fileContent);
    }
    getLines() {
        return this.lines;
    }
    update({ marker, content }) {
        const startMarker = new RegExp(`\<\!-- ${escapeRegExp(marker)} START`);
        const endMarker = new RegExp(`\<\!-- ${escapeRegExp(marker)} END`);
        let startIndex = null;
        let endIndex = null;
        for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
            const line = this.lines[lineIdx];
            if (startMarker.test(line)) {
                startIndex = lineIdx;
            }
            if (endMarker.test(line)) {
                endIndex = lineIdx;
                break;
            }
        }
        const newLines = splitStringIntoLines(content);
        if (!endIndex || !startIndex) {
            // Insert new lines
            this.lines.splice(0, 0, ...[
                `<!-- ${marker} START AUTO GENERATED -->`,
                '',
                ...newLines,
                '',
                `<!-- ${marker} END AUTO GENERATED -->`,
                '',
            ]);
        }
        else {
            // remove the lines between the markers and add the updates lines
            this.lines.splice(startIndex + 1, endIndex - startIndex - 2, ...newLines);
        }
    }
    getContent() {
        return this.lines.join('\r\n');
    }
}
exports.FileUpdater = FileUpdater;
function splitStringIntoLines(content) {
    return content.split(/\r?\n/);
}
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
//# sourceMappingURL=FileUpdater.js.map