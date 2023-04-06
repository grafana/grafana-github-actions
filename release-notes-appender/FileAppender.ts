import fs from 'fs'
import path from 'path'
import { splitStringIntoLines } from '../common/utils'

interface FileAppenderOptions {
	cwd?: string
}

export class FileAppender {
	private lines: string[] = []
	private options: FileAppenderOptions = {}

	constructor(opts: FileAppenderOptions = {}) {
		this.options = opts
	}

	loadFile(relPath: string) {
		let filePath = this.options.cwd ? path.resolve(this.options.cwd, relPath) : relPath
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found ${filePath}`)
		}

		const fileContent = fs.readFileSync(filePath, 'utf-8')
		this.lines = splitStringIntoLines(fileContent)
	}

	append(content: string) {
		this.lines.push(content)
	}

	writeFile(relPath: string) {
		let filePath = this.options.cwd ? path.resolve(this.options.cwd, relPath) : relPath
		fs.writeFileSync(filePath, this.getContent(), { encoding: 'utf-8' })
	}

	public getContent() {
		return this.lines.join('\r\n')
	}
}
