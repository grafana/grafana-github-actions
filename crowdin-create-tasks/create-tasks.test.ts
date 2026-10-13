import { readFileSync } from 'fs'
import { join } from 'path'
import { Script } from 'vm'
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript'

// Run the CLI's top-level await with mocked APIs, without reading credentials or contacting Crowdin.
const source = transpileModule(readFileSync(join(__dirname, 'create-tasks.ts'), 'utf8'), {
	compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2021 },
}).outputText
const script = new Script(`(async () => { ${source} })()`)

describe('Crowdin task creation', () => {
	const languages = [
		{ id: 'fr', name: 'French' },
		{ id: 'de', name: 'German' },
		{ id: 'es', name: 'Spanish' },
	]
	let client: {
		projectsGroupsApi: { getProject: jest.Mock }
		workflowsApi: { listWorkflowSteps: jest.Mock }
		sourceStringsApi: { withFetchAll: jest.Mock; listProjectStrings: jest.Mock }
		tasksApi: { addTask: jest.Mock }
	}
	let output: { log: jest.Mock; error: jest.Mock }
	let processMock: { env: Record<string, string>; exitCode?: number; exit: jest.Mock }

	beforeEach(() => {
		client = {
			projectsGroupsApi: {
				getProject: jest.fn().mockResolvedValue({ data: { targetLanguages: languages } }),
			},
			workflowsApi: {
				listWorkflowSteps: jest
					.fn()
					.mockResolvedValue({ data: [{ data: { id: 7, type: 'Translate' } }] }),
			},
			sourceStringsApi: {
				withFetchAll: jest.fn().mockReturnThis(),
				listProjectStrings: jest.fn().mockResolvedValue({ data: [{ data: { id: 42 } }] }),
			},
			tasksApi: { addTask: jest.fn().mockResolvedValue({ data: { id: 123 } }) },
		}
		output = { log: jest.fn(), error: jest.fn() }
		processMock = {
			env: { CROWDIN_PERSONAL_TOKEN: 'test-token', CROWDIN_PROJECT_ID: '1' },
			exit: jest.fn((code) => {
				throw new Error(`Process exited with code ${code}`)
			}),
		}
	})

	async function run() {
		await script.runInNewContext({
			require: (name: string) => {
				if (name !== '@crowdin/crowdin-api-client') {
					throw new Error(`Unexpected module: ${name}`)
				}
				return { Client: jest.fn().mockReturnValue(client) }
			},
			exports: {},
			process: processMock,
			console: output,
			Error,
		})
	}

	it('creates tasks for every language with the existing translation settings', async () => {
		await run()
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(3)
		expect(client.tasksApi.addTask).toHaveBeenNthCalledWith(1, 1, {
			title: 'Translate to French',
			description: '{{tos_service_type: premium}}',
			languageId: 'fr',
			workflowStepId: 7,
			skipAssignedStrings: true,
			stringIds: [42],
			assignees: [{ id: 133 }],
		})
		expect(processMock.exitCode).toBeUndefined()
		expect(output.error).not.toHaveBeenCalled()
	})

	it('succeeds when every language has no untranslated strings', async () => {
		client.sourceStringsApi.listProjectStrings.mockResolvedValue({ data: [] })
		await run()
		expect(client.sourceStringsApi.withFetchAll).toHaveBeenCalledTimes(3)
		expect(client.tasksApi.addTask).not.toHaveBeenCalled()
		expect(processMock.exitCode).toBeUndefined()
		expect(output.error).not.toHaveBeenCalled()
	})

	it('skips a no-untranslated-words task response and continues creating tasks', async () => {
		client.tasksApi.addTask.mockRejectedValueOnce(new Error('Language has no untranslated words'))
		await run()
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(3)
		expect(output.log).toHaveBeenCalledWith(expect.stringMatching(/fr.*skipping/))
		expect(output.error).not.toHaveBeenCalled()
		expect(processMock.exitCode).toBeUndefined()
	})

	it('succeeds when Crowdin reports no untranslated words for every task', async () => {
		client.tasksApi.addTask.mockRejectedValue(new Error('Language has no untranslated words'))
		await run()
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(3)
		expect(processMock.exitCode).toBeUndefined()
		expect(output.error).not.toHaveBeenCalled()
	})

	it('reports multiple failures only after attempting the remaining languages', async () => {
		client.tasksApi.addTask.mockRejectedValueOnce(new Error('Forbidden'))
		client.sourceStringsApi.listProjectStrings
			.mockResolvedValueOnce({ data: [{ data: { id: 42 } }] })
			.mockRejectedValueOnce(new Error('Rate limit exceeded'))
		await run()
		expect(client.sourceStringsApi.listProjectStrings).toHaveBeenCalledTimes(3)
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(2)
		expect(client.tasksApi.addTask.mock.calls[1][1].languageId).toBe('es')
		const errors = output.error.mock.calls.flat().map(String).join('\n')
		expect(errors).toContain('French (fr)')
		expect(errors).toContain('Forbidden')
		expect(errors).toContain('German (de)')
		expect(errors).toContain('Rate limit exceeded')
		expect(output.error.mock.invocationCallOrder[0]).toBeGreaterThan(
			client.tasksApi.addTask.mock.invocationCallOrder[1],
		)
		expect(processMock.exitCode).toBe(1)
		expect(processMock.exit).not.toHaveBeenCalled()
	})

	it('does not suppress unrelated errors containing the no-untranslated-words message', async () => {
		client.tasksApi.addTask.mockRejectedValueOnce(
			new Error('Unexpected: Language has no untranslated words'),
		)
		await run()
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(3)
		expect(processMock.exitCode).toBe(1)
	})

	it('does not treat string lookup failures as an empty translation task', async () => {
		client.sourceStringsApi.listProjectStrings.mockRejectedValueOnce(
			new Error('Language has no untranslated words'),
		)
		await run()
		expect(client.tasksApi.addTask).toHaveBeenCalledTimes(2)
		expect(processMock.exitCode).toBe(1)
	})

	it('stops before creating tasks if the project cannot be loaded', async () => {
		client.projectsGroupsApi.getProject.mockRejectedValue(new Error('Project not found'))
		await expect(run()).rejects.toThrow('Process exited with code 1')
		expect(client.tasksApi.addTask).not.toHaveBeenCalled()
	})
})
