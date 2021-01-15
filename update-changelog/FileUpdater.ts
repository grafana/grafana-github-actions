import fs from 'fs'
import { escapeRegExp } from 'lodash'
import { splitStringIntoLines } from '../common/utils'
import semver from 'semver'

export class FileUpdater {
	private lines: string[] = []

	loadFile(filePath: string) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found ${filePath}`)
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8')
		this.lines = splitStringIntoLines(fileContent)
	}

	getLines() {
		return this.lines
	}

	update({ version, content }: { version: string; content: string }) {
		const startMarker = new RegExp(`<!-- (.*) START`)
		const endMarker = new RegExp(`<!-- ${escapeRegExp(version)} END`)

		let startIndex = 0
		let endIndex = 0

		for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
			const line = this.lines[lineIdx]

			const startMatches = startMarker.exec(line)
			if (startMatches) {
				if (startMatches[1] === version) {
					startIndex = lineIdx + 1
				}
				// check if our version is greater than are current position
				else if (semver.gt(version, startMatches[1])) {
					startIndex = Math.max(lineIdx - 1, 0)
					endIndex = Math.max(lineIdx - 1, 0)
					break
				}
			}

			if (endMarker.test(line)) {
				endIndex = lineIdx
				break
			}
		}

		const newLines = splitStringIntoLines(content)

		if (endIndex === startIndex) {
			// Insert new lines
			this.lines.splice(
				startIndex,
				0,
				...['', `<!-- ${version} START -->`, '', ...newLines, `<!-- ${version} END -->`],
			)
		} else {
			// remove the lines between the markers and add the updates lines
			this.lines.splice(startIndex, endIndex - startIndex, '', ...newLines)
		}
	}

	writeFile(filePath: string) {
		fs.writeFileSync(filePath, this.getContent(), { encoding: 'utf-8' })
	}

	public getContent() {
		return this.lines.join('\r\n')
	}
}
