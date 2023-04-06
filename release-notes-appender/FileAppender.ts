import fs from 'fs'
import { splitStringIntoLines } from '../common/utils'

export class FileAppender {
	private lines: string[] = []

	loadFile(filePath: string) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found ${filePath}`)
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8')
		this.lines = splitStringIntoLines(fileContent)
	}

	append(content: string) {
		this.lines.push(content)
	}

	writeFile(filePath: string) {
		fs.writeFileSync(filePath, this.getContent(), { encoding: 'utf-8' })
	}

	public getContent() {
		return this.lines.join('\r\n')
	}
}
