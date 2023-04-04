import { getVersionMatch } from './versions'

describe('BumpVersion', () => {
	describe('validateVersion', () => {
		it('should allow for beta releases', async () => {
			const match = getVersionMatch('10.0.0-beta1')
			expect(match).not.toBeNull()
			expect(match).toHaveLength(5)
			expect(match[2]).toEqual('beta1')
			expect(match[1]).toEqual('10.0')
		})
		it('should allow for pre releases', async () => {
			const match = getVersionMatch('10.0.0-pre')
			expect(match).not.toBeNull()
			expect(match).toHaveLength(5)
			expect(match[2]).toEqual('pre')
			expect(match[1]).toEqual('10.0')
		})
		it('should allow for non-prerelease versions', async () => {
			const match = getVersionMatch('10.1.2')
			expect(match).not.toBeNull()
			expect(match).toHaveLength(5)
			expect(match[2]).toBeUndefined()
			expect(match[1]).toEqual('10.1')
		})
	})
})
