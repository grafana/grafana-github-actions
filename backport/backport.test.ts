import { exec, getExecOutput } from '@actions/exec'
import {
	BETTERER_RESULTS_PATH,
	backport,
	getFinalLabels,
	isBettererConflict,
	getFailedBackportCommentBody,
} from './backport'

jest.mock('@actions/exec')
jest.mock('@actions/core', () => ({
	error: jest.fn(),
	group: (_name: string, fn: () => Promise<unknown>) => fn(),
	info: jest.fn(),
	setFailed: jest.fn(),
}))
jest.mock('../common/git', () => ({
	cloneRepo: jest.fn().mockResolvedValue(undefined),
	setConfig: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@betterer/betterer', () => ({ betterer: jest.fn() }))
jest.mock('@actions/github', () => ({
	context: { payload: { action: 'closed' } },
	GitHub: jest.fn(),
}))

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

describe('backport/error-propagation', () => {
	const mockExec = exec as jest.MockedFunction<typeof exec>
	const mockGetExecOutput = getExecOutput as jest.MockedFunction<typeof getExecOutput>

	const mockGithub = {
		issues: {
			createComment: jest.fn().mockResolvedValue({}),
			addLabels: jest.fn().mockResolvedValue({}),
			removeLabel: jest.fn().mockResolvedValue({}),
			listMilestonesForRepo: jest.fn().mockResolvedValue({ data: [] }),
			update: jest.fn().mockResolvedValue({}),
		},
		pulls: {
			create: jest.fn().mockResolvedValue({ data: { number: 1 } }),
		},
	}

	const mockIssue = {
		getIssue: jest.fn().mockResolvedValue({ labels: [], body: null }),
	}

	const backportArgs = {
		issue: mockIssue as any,
		labelsToAdd: [],
		payload: {
			action: 'closed',
			label: { name: '' },
			pull_request: {
				labels: [{ name: 'backport v10.0.x' }, { name: 'type/bug' }],
				merge_commit_sha: 'abc123',
				merged: true,
				number: 42,
				title: 'fix: some fix',
				merged_by: { login: 'user' },
			},
			repository: { name: 'test-repo', owner: { login: 'test-owner' } },
		} as any,
		titleTemplate: '[{{base}}] {{originalTitle}}',
		removeDefaultReviewers: false,
		github: mockGithub as any,
		token: 'test-token',
		sender: { login: 'user' } as any,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		// git switch, git switch --create succeed; cherry-pick fails; cherry-pick --abort succeeds
		mockExec
			.mockResolvedValueOnce(0)
			.mockResolvedValueOnce(0)
			.mockRejectedValueOnce(new Error('Process failed: /usr/bin/git failed with exit code 1'))
			.mockResolvedValueOnce(0)
		mockGetExecOutput.mockResolvedValue({ stdout: 'conflicted-file.ts', stderr: '', exitCode: 1 })
	})

	test('rejects when cherry-pick fails', async () => {
		await expect(backport(backportArgs)).rejects.toThrow()
	})
})
