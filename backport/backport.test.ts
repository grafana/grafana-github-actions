import { BETTERER_RESULTS_PATH, isBettererConflict } from './backport'

const onlyDocsChanges = ['docs/sources/_index.md', 'docs/sources/other.md']
const onlyBettererChanges = [BETTERER_RESULTS_PATH]

test('isBettererConflict/onlyDocsChanges', () => {
	return expect(isBettererConflict(onlyDocsChanges)).resolves.toStrictEqual(false)
})
test('isBettererConflict/onlyBettererChanges', () => {
	return expect(isBettererConflict(onlyBettererChanges)).resolves.toStrictEqual(true)
})
