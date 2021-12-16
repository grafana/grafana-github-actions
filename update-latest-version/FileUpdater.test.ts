import { FileUpdater, LatestVersionContent } from './FileUpdater'

describe('FileUpdater', () => {
	describe('Can load file', () => {
		it('should have content', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/latest.json`)

			updater.getContent()
			JSON.parse(updater.getContent())
			let c: LatestVersionContent = JSON.parse(updater.getContent())

			expect(c.stable).toBe('8.3.3')
			expect(c.testing).toBe('8.3.3')
		})
	})

	describe('When adding new stable release', () => {
		const updater = new FileUpdater()
		updater.loadFile(`${__dirname}/testdata/latest.json`)

		updater.update({
			version: '8.4.0',
		})

		updater.getContent()
		JSON.parse(updater.getContent())
		let c: LatestVersionContent = JSON.parse(updater.getContent())

		expect(c.stable).toBe('8.4.0')
		expect(c.testing).toBe('8.4.0')
	})

	describe('When adding new beta release', () => {
		const updater = new FileUpdater()
		updater.loadFile(`${__dirname}/testdata/latest.json`)

		updater.update({
			version: '8.4.0-beta1',
		})

		updater.getContent()
		JSON.parse(updater.getContent())
		let c: LatestVersionContent = JSON.parse(updater.getContent())

		expect(c.stable).toBe('8.3.3')
		expect(c.testing).toBe('8.4.0-beta1')
	})

	describe('When invalid version', () => {
		const updater = new FileUpdater()
		updater.loadFile(`${__dirname}/testdata/latest.json`)

		const t = () => {
			updater.update({
				version: 'v8.4.0-beta1',
			})
		}
		expect(t).toThrow('Invalid version: v8.4.0-beta1')

		updater.getContent()
		JSON.parse(updater.getContent())
		let c: LatestVersionContent = JSON.parse(updater.getContent())

		expect(c.stable).toBe('8.3.3')
		expect(c.testing).toBe('8.3.3')
	})
})
