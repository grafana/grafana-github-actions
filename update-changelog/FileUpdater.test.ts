import { FileUpdater } from './FileUpdater'

describe('FileUpdater', () => {
	describe('Can load file', () => {
		it('should have lines', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			expect(updater.getLines().length).toBeGreaterThan(17)
		})
	})

	describe('When adding new minor release', () => {
		it('should add to beginning of file', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			updater.update({
				version: '8.1.0-beta1',
				content: `Updated content\n`,
			})

			expect(updater.getContent()).toMatchInlineSnapshot(`
			"
			<!-- 8.1.0-beta1 START -->

			Updated content

			<!-- 8.1.0-beta1 END -->

			<!-- 8.0.0 START -->

			# 8.0.0 (unreleased)

			<!-- 8.0.0 END -->

			<!-- 7.3.2 START -->

			# 7.3.2 (2020-11-11)

			<!-- 7.3.2 END -->

			<!-- 7.3.1 START -->

			# 7.3.1 (2020-10-30)

			<!-- 7.3.1 END -->
			"
		`)
		})
	})

	describe('When adding a new patch release with newer minor release at the top', () => {
		it('should add after last patch', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			updater.update({
				version: '7.3.3',
				content: `Updated content\n`,
			})

			expect(updater.getContent()).toMatchInlineSnapshot(`
			"
			<!-- 8.0.0 START -->

			# 8.0.0 (unreleased)

			<!-- 8.0.0 END -->

			<!-- 7.3.3 START -->

			Updated content

			<!-- 7.3.3 END -->

			<!-- 7.3.2 START -->

			# 7.3.2 (2020-11-11)

			<!-- 7.3.2 END -->

			<!-- 7.3.1 START -->

			# 7.3.1 (2020-10-30)

			<!-- 7.3.1 END -->
			"
		`)
		})
	})

	describe('When updating a release', () => {
		it('should only update the correct release', () => {
			const updater = new FileUpdater()
			updater.loadFile(`${__dirname}/testdata/changelog1.md`)

			updater.update({
				version: '7.3.2',
				content: `Updated content\n`,
			})

			expect(updater.getContent()).toMatchInlineSnapshot(`
			"
			<!-- 8.0.0 START -->

			# 8.0.0 (unreleased)

			<!-- 8.0.0 END -->

			<!-- 7.3.2 START -->

			Updated content

			<!-- 7.3.2 END -->

			<!-- 7.3.1 START -->

			# 7.3.1 (2020-10-30)

			<!-- 7.3.1 END -->
			"
		`)
		})
	})
})
