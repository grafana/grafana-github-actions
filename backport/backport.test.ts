import {
	BETTERER_RESULTS_PATH,
	getFinalLabels,
	isBettererConflict,
	getFailedBackportCommentBody,
} from './backport'

const onlyDocsChanges = ['docs/sources/_index.md', 'docs/sources/other.md']
const onlyBettererChanges = [BETTERER_RESULTS_PATH]

test('isBettererConflict/onlyDocsChanges', () => {
	return expect(isBettererConflict(onlyDocsChanges)).resolves.toStrictEqual(false)
})
test('isBettererConflict/onlyBettererChanges', () => {
	return expect(isBettererConflict(onlyBettererChanges)).resolves.toStrictEqual(true)
})

test('getFinalLabels/simple', () => {
	return expect(getFinalLabels(['hello', 'world'], [])).toEqual(new Set(['hello', 'world']))
})

// All those `backport .*` should be removed from the labels ported over.
test('getFinalLabels/remove-backports', () => {
	return expect(getFinalLabels(['backport v10.0.x', 'world'], [])).toEqual(new Set(['world']))
})

// The backport-failed label should not be ported over.
test('getFinalLabels/remove-backport-failed', () => {
	return expect(getFinalLabels(['backport-failed', 'world'], [])).toEqual(new Set(['world']))
})

// If a backport label for a specific target is explicitly requested by the
// configuration, it should still be included.
test('getFinalLabels/remove-backports-original-only', () => {
	return expect(getFinalLabels(['backport v10.0.x', 'world'], ['backport v10.0.x'])).toEqual(
		new Set(['backport v10.0.x', 'world']),
	)
})

// If the original PR has the `add to changelog` label set but we explicitly
// configured `no-changelog`, then the latter should override the first:
test('getFinalLabels/enforce-no-changelog', () => {
	return expect(getFinalLabels(['add to changelog', 'world'], ['no-changelog'])).toEqual(
		new Set(['no-changelog', 'world']),
	)
})

// If the original PR has the `no-changelog` label set but we explicitly
// configured `add to changelog`, then the latter should override the first:
test('getFinalLabels/enforce-add-to-changelog', () => {
	return expect(getFinalLabels(['no-changelog', 'world'], ['add to changelog'])).toEqual(
		new Set(['add to changelog', 'world']),
	)
})

test('getFailedBackportCommentBody/gh-line-no-body', () => {
	const output = getFailedBackportCommentBody({
		base: 'v10.0.x',
		commitToBackport: '123456',
		errorMessage: 'some error',
		head: 'backport-123-to-v10.0.x',
		title: '[v10.0.x] hello world',
		originalNumber: 123,
		labels: ['backport'],
		hasBody: false,
	})
	expect(output).toContain(
		`gh pr create --title '[v10.0.x] hello world' --body 'Backport 123456 from #123' --label 'backport' --base v10.0.x --milestone 10.0.x --web`,
	)
	expect(output).toContain('git push --set-upstream origin backport-123-to-v10.0.x')
})

test('getFailedBackportCommentBody/gh-line-with-body', () => {
	const output = getFailedBackportCommentBody({
		base: 'v10.0.x',
		commitToBackport: '123456',
		errorMessage: 'some error',
		head: 'backport-123-to-v10.0.x',
		title: '[v10.0.x] hello world',
		originalNumber: 123,
		labels: ['backport', 'no-changelog'],
		hasBody: true,
	})
	expect(output).toContain(
		`gh pr create --title '[v10.0.x] hello world' --body-file - --label 'backport' --label 'no-changelog' --base v10.0.x --milestone 10.0.x --web`,
	)
	expect(output).toContain('git push --set-upstream origin backport-123-to-v10.0.x')
})
