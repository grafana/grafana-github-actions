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

	// Missing the `.0` patch version.
	// Although semver requires that every bump of a major or minor version resets the patch version,
	// it is not always the case that the tag will exist in the repository.
	// For example, the first release might be made privately in a fork and might never be made public
	// because of bugs or security concerns.
	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.1'],
			'release-1.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('true')
	// Don't allow release candidates to be considered "proper" releases.
	expect(
		hasMatchingReleaseTagWithRefNames(
			['v1.0.1-rc.1'],
			'release-1.0',
			new RegExp('^v(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
			new RegExp('^release-(0|[1-9]\\d*)\\.(0|[1-9]\\d*)$'),
		),
	).toBe('false')
})
