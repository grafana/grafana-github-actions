import { exec } from '@actions/exec'
import { release } from './release'

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
jest.mock('./FileAppender', () => ({
	FileAppender: jest.fn().mockImplementation(() => ({
		loadFile: jest.fn(),
		append: jest.fn(),
		writeFile: jest.fn(),
	})),
}))
jest.mock('@actions/github', () => ({
	context: {
		payload: {
			action: 'closed',
			pull_request: { html_url: 'https://github.com/grafana/grafana/pull/42' },
		},
	},
	GitHub: jest.fn(),
}))

describe('release/error-propagation', () => {
	const mockExec = exec as jest.MockedFunction<typeof exec>

	const mockGithub = {
		issues: {
			createComment: jest.fn().mockResolvedValue({}),
			addLabels: jest.fn().mockResolvedValue({}),
			update: jest.fn().mockResolvedValue({}),
		},
		pulls: {
			create: jest.fn().mockResolvedValue({ data: { number: 1, requested_reviewers: [] } }),
			deleteReviewRequest: jest.fn().mockResolvedValue({}),
			createReviewRequest: jest.fn().mockResolvedValue({}),
		},
	}

	const releaseArgs = {
		labelsToAdd: [],
		payload: {
			pull_request: {
				labels: [{ name: 'add-to-release-notes' }],
				merged: true,
				number: 42,
				title: 'fix: some fix',
				html_url: 'https://github.com/grafana/grafana/pull/42',
				milestone: null,
				merged_by: { login: 'user' },
			},
			repository: { name: 'test-repo', owner: { login: 'test-owner' } },
		} as any,
		titleTemplate: 'Add {{pullRequestNumber}} to release notes',
		releaseNotesFile: 'release-notes.md',
		github: mockGithub as any,
		token: 'test-token',
		sender: { login: 'user' } as any,
	}

	beforeEach(() => {
		jest.clearAllMocks()
		mockExec.mockRejectedValue(new Error('Process failed: /usr/bin/git failed with exit code 1'))
	})

	test('rejects when git operation fails', async () => {
		await expect(release(releaseArgs)).rejects.toThrow()
	})
})
