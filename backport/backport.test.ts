import { exec, getExecOutput } from '@actions/exec'
import { promises as fs } from 'fs'
import os from 'os'
import path from 'path'
import {
	BETTERER_RESULTS_PATH,
	buildFileChanges,
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

describe('buildFileChanges', () => {
	let repoDir: string

	const gitInit = async () => {
		await exec('git', ['init', '-q', '-b', 'main'], { cwd: repoDir, silent: true })
		await exec('git', ['config', 'user.email', 't@example.com'], { cwd: repoDir, silent: true })
		await exec('git', ['config', 'user.name', 't'], { cwd: repoDir, silent: true })
		await exec('git', ['config', 'commit.gpgsign', 'false'], { cwd: repoDir, silent: true })
	}

	beforeEach(async () => {
		repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backport-test-'))
		await gitInit()
	})

	afterEach(async () => {
		await fs.rm(repoDir, { recursive: true, force: true })
	})

	test('detects additions, modifications and deletions', async () => {
		// Base state: keep.txt and del.txt exist with known content.
		await fs.writeFile(path.join(repoDir, 'keep.txt'), 'keep-v1\n')
		await fs.writeFile(path.join(repoDir, 'del.txt'), 'will be deleted\n')
		await exec('git', ['add', '.'], { cwd: repoDir, silent: true })
		await exec('git', ['commit', '-q', '-m', 'base'], { cwd: repoDir, silent: true })
		const { stdout: baseRaw } = await getExecOutput('git', ['rev-parse', 'HEAD'], {
			cwd: repoDir,
			silent: true,
		})
		const base = baseRaw.trim()

		// Tip state: modify keep.txt, add new.txt, delete del.txt.
		await fs.writeFile(path.join(repoDir, 'keep.txt'), 'keep-v2\n')
		await fs.writeFile(path.join(repoDir, 'new.txt'), 'brand-new\n')
		await fs.rm(path.join(repoDir, 'del.txt'))
		await exec('git', ['add', '-A'], { cwd: repoDir, silent: true })
		await exec('git', ['commit', '-q', '-m', 'tip'], { cwd: repoDir, silent: true })

		const changes = await buildFileChanges(repoDir, base, 'HEAD')

		const paths = changes.additions.map((a) => a.path).sort()
		expect(paths).toEqual(['keep.txt', 'new.txt'])

		const decoded = (p: string) =>
			Buffer.from(changes.additions.find((a) => a.path === p)!.contents, 'base64').toString()
		expect(decoded('keep.txt')).toBe('keep-v2\n')
		expect(decoded('new.txt')).toBe('brand-new\n')

		expect(changes.deletions).toEqual([{ path: 'del.txt' }])
	})
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
