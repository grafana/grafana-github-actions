import { filterRefNames, hasMatchingReleaseTagWithRefNames } from './hasMatchingReleaseTag'

test('filterRefNames', () => {
	expect(
		filterRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toStrictEqual(['v1.0.0', 'v1.0.1'])
})

test('hasMatchingReleaseTagWithRefNames', () => {
	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'release-1.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('true')

	// Not providing the releaseBranchWithPatch regexp.
	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'release-1.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'v1.0.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'release-1.0.1',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('true')

	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'release-1.1',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('false')

	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.0', 'v1.0.1', 'release-1.0.0', 'release-1.0.1', 'not-release'],
			'release-2.0.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('false')
})
