import fs from 'fs'
import { escapeRegExp } from 'lodash'
import { splitStringIntoLines } from '../common/utils'

export class FileUpdater {
	private lines: string[] = []

	loadFile(filePath: string) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found ${filePath}`)
		}

		const fileContent = require('fs').readFileSync(filePath, 'utf-8')
		this.lines = splitStringIntoLines(fileContent)
	}

	getLines() {
		return this.lines
	}

	update({ marker, content }: { marker: string; content: string }) {
		const startMarker = new RegExp(`\<\!-- ${escapeRegExp(marker)} START`)
		const endMarker = new RegExp(`\<\!-- ${escapeRegExp(marker)} END`)

		let startIndex: number | null = null
		let endIndex: number | null = null

		for (let lineIdx = 0; lineIdx < this.lines.length; lineIdx++) {
			const line = this.lines[lineIdx]

			if (startMarker.test(line)) {
				startIndex = lineIdx
			}

			if (endMarker.test(line)) {
				endIndex = lineIdx
				break
			}
		}

		const newLines = splitStringIntoLines(content)

		if (!endIndex || !startIndex) {
			// Insert new lines
			this.lines.splice(
				0,
				0,
				...[
					`<!-- ${marker} START AUTO GENERATED -->`,
					'',
					...newLines,
					'',
					`<!-- ${marker} END AUTO GENERATED -->`,
					'',
				],
			)
		} else {
			// remove the lines between the markers and add the updates lines
			this.lines.splice(startIndex + 1, endIndex - startIndex - 2, ...newLines)
		}
	}

	public getContent() {
		return this.lines.join('\r\n')
	}
}
