import { BETTERER_RESULTS_PATH, isBettererConflict, getFailedBackportCommentBody } from './backport'

const onlyDocsChanges = ['docs/sources/_index.md', 'docs/sources/other.md']
const onlyBettererChanges = [BETTERER_RESULTS_PATH]

test('isBettererConflict/onlyDocsChanges', () => {
	return expect(isBettererConflict(onlyDocsChanges)).resolves.toStrictEqual(false)
})
test('isBettererConflict/onlyBettererChanges', () => {
	return expect(isBettererConflict(onlyBettererChanges)).resolves.toStrictEqual(true)
})

test('getFailedBackportCommentBody/gh-line', () => {
	const output = getFailedBackportCommentBody({
		base: 'v10.0.x',
		commitToBackport: '123456',
		errorMessage: 'some error',
		head: 'backport-123-to-v10.0.x',
		title: '[v10.0.x] hello world',
		originalNumber: 123,
	})
	expect(output).toContain(
		'gh pr create --title "[v10.0.x] hello world" --body "Backport 123456 from #123" --label backport --base v10.0.x --milestone 10.0.x --web',
	)
})
