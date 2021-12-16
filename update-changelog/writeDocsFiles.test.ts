import { readFileSync } from 'fs'
import mock from 'mock-fs'
import path from 'path'
import { ReleaseNotesBuilder } from './ReleaseNotesBuilder'
import { writeDocsFiles } from './writeDocsFiles'

describe('writeDocsFiles', () => {
	afterEach(() => {
		mock.restore()
	})
	test('should write release notes into the correct path', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-v8-3-3.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.3.3'
		const file = './docs/sources/release-notes/release-notes-8-3-3.md'
		const builder = {
			buildReleaseNotes: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ReleaseNotesBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildReleaseNotes).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).not.toContain('Empty file')
		expect(result).toContain('Release notes')
		expect(result).toContain('This is my test title')
	})

	test('should update index.md file with reference to release notes', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-v8-3-3.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.3.3'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildReleaseNotes: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ReleaseNotesBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildReleaseNotes).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain('- [Release notes for 8.3.3]({{< relref "release-notes-8-3-3" >}})')
	})
})
