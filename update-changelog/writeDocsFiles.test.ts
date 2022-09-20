import { readFileSync } from 'fs'
import mock from 'mock-fs'
import path from 'path'
import { ChangelogBuilder } from './ChangelogBuilder'
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
						'release-notes-8-3-3.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.3.3'
		const file = './docs/sources/release-notes/release-notes-8-3-3.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
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
						'release-notes-8-3-3.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.3.3'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain('- [Release notes for 8.3.3]({{< relref "release-notes-8-3-3" >}})')
	})

	test('should not add release notes link again if it already exists', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-8-3-2.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.3.2'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		const stringToMatch = new RegExp(`Release notes for ${version}`, 'g')
		const matches = (result.match(stringToMatch) || []).length
		expect(matches).toBe(1)
	})

	test('should add previous version release notes at the proper position', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-7-5-13.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '7.5.13'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain(
			'- [Release notes for 8.0.0-beta1]({{< relref "release-notes-8-0-0-beta1" >}})\n- [Release notes for 7.5.13]({{< relref "release-notes-7-5-13" >}})',
		)
	})

	test('should add version 9.0.0-beta1 to the very front', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-9-0-0-beta1.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '9.0.0-beta1'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain(
			'- [Release notes for 9.0.0-beta1]({{< relref "release-notes-9-0-0-beta1" >}})\n- [Release notes for 8.4.0-beta1]({{< relref "release-notes-8-4-0-beta1" >}})',
		)
	})

	test('should add version 7.2.0 to the very end', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-7-2-0.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '7.2.0'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain(
			'- [Release notes for 7.3.0]({{< relref "release-notes-7-3-0" >}})\n- [Release notes for 7.2.0]({{< relref "release-notes-7-2-0" >}})',
		)
	})
	test.only('should add version 8.4.0 after 8.4.0-beta1', async () => {
		// Arrange
		mock({
			docs: {
				sources: {
					'release-notes': {
						'release-notes-8-4-0.md': 'Empty file',
						'_index.md': readFileSync(path.resolve(__dirname, 'testdata/_index.md'), 'utf8'),
					},
				},
			},
		})
		const version = '8.4.0'
		const file = './docs/sources/release-notes/_index.md'
		const builder = {
			buildChangelog: jest.fn().mockResolvedValue('Release notes'),
			getTitle: jest.fn().mockReturnValue('This is my test title'),
		} as unknown as ChangelogBuilder

		// Act
		await writeDocsFiles({ version, builder })

		// Assert
		expect(builder.buildChangelog).toHaveBeenCalledTimes(1)
		const result = readFileSync(file, 'utf8')
		expect(result).toContain(
			'- [Release notes for 8.4.0]({{< relref "release-notes-8-4-0" >}})\n- [Release notes for 8.4.0-beta1]({{< relref "release-notes-8-4-0-beta1" >}})',
		)
	})
})
