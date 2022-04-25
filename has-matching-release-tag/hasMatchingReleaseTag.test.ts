import { filterRefNames, hasMatchingReleaseTagWithRefNames } from './hasMatchingReleaseTag'

const refNames = ['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release']
const releaseTagRegexp = new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$')

const releaseBranchWithoutPatchRegexp = new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$')
const releaseBranchWithPatchRegexp = new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$')
test('filterRefNames', () => {
	expect(filterRefNames(refNames, releaseTagRegexp)).toStrictEqual(['v1.0.0', 'v1.0.1'])
})

test('hasMatchingReleaseTagWithRefNames', () => {
	expect(
		hasMatchingReleaseTagWithRefNames(
			refNames,
			'v1.0.0',
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			refNames,
			'release-1.0',
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			refNames,
			'release-1.0.1',
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			refNames,
			'release-1.1',
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		),
	).toBe('false')

	expect(
		hasMatchingReleaseTagWithRefNames(
			refNames,
			'release-2.0.0',
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		),
	).toBe('false')
})
