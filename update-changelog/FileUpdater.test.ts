import { FileUpdater } from './FileUpdater'

describe('FileUpdater', () => {
	describe('Can load file', () => {
		it('should have lines', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			expect(updater.getLines().length).toBe(39)
		})
	})

	describe('When adding new release', () => {
		it('should add to beginning of file', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			updater.update({
				marker: '8.0.0',
				content: `Updated content`,
			})

			expect(updater.getContent()).toMatchSnapshot()
		})
	})

	describe('When updating the latest release', () => {
		it('should only update the latest section', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			updater.update({
				marker: '7.3.2',
				content: `Updated content`,
			})

			expect(updater.getContent()).toMatchSnapshot()
		})
	})
})
