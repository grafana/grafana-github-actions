import { isPreRelease } from './utils'
import { expect as jestExpect } from '@jest/globals'

describe('GitHub Release Utils', () => {
	it('should be a pre-release if version is not stable', () => {
		//arrange
		const preReleaseVersionVariants = ['v1.2.3-beta', 'v9.4.2-test', 'v3.2.2-omgthisisnotarealrelease']
		//act
		for (const version of preReleaseVersionVariants) {
			jestExpect(isPreRelease(version)).toBe(true)
		}
	})

	it('should not be a pre-release if version is stable', () => {
		//arrange
		const preReleaseVersionVariants = ['v7.4.0', 'v9.4.2', 'v8.3.0']
		//act
		for (const version of preReleaseVersionVariants) {
			jestExpect(isPreRelease(version)).toBe(false)
		}
	})
})
