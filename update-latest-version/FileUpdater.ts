import fs from 'fs'

export interface LatestVersionContent {
	stable: string
	testing: string
}

export class FileUpdater {
	private fileContent: string = ''

	loadFile(filePath: string) {
		if (!fs.existsSync(filePath)) {
			throw new Error(`File not found ${filePath}`)
		}

		this.fileContent = fs.readFileSync(filePath, 'utf-8')
	}

	update({ version }: { version: string }) {
		const regex = RegExp(`^[0-9]+.[0-9]+.[0-9]+(?<is_beta>-beta[0-9]+)?$`)
		const match = regex.exec(version)

		if (!match) {
			throw new Error(`Invalid version: ${version}`)
		}

		let c: LatestVersionContent = JSON.parse(this.fileContent)
		if (!match?.groups?.is_beta) {
			c.stable = version
		}
		c.testing = version

		this.fileContent = JSON.stringify(c)
	}

	writeFile(filePath: string) {
		fs.writeFileSync(filePath, this.fileContent, { encoding: 'utf-8' })
	}

	getContent() {
		return this.fileContent
	}
}
