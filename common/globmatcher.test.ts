import { checkMatch } from './globmatcher'

describe('glob matching', () => {
	describe('any', () => {
		it('should match any file', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					any: ['**'],
				},
			)
			expect(result).toBeTruthy()
		})

		it('should match any backend files', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					any: ['backend/**/*'],
				},
			)
			expect(result).toBeTruthy()
		})

		it('should not match any docs files', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					any: ['docs/**/*'],
				},
			)
			expect(result).toBeFalsy()
		})
	})

	describe('all', () => {
		it('should match all changed files', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					all: ['**'],
				},
			)
			expect(result).toBeTruthy()
		})

		it('should not match all backend files', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					all: ['backend/**/*'],
				},
			)
			expect(result).toBeFalsy()
		})

		it('should not match all docs files', () => {
			const result = checkMatch(
				['backend/backend.go', 'backend/a/b/c/c.go', 'src/app.ts', 'src/app.ts/a/b/c/c.ts'],
				{
					all: ['docs/**/*'],
				},
			)
			expect(result).toBeFalsy()
		})
	})
})
