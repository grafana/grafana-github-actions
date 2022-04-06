import { map } from './map'

test('mappings', () => {
	expect(map('v1.2.3', ['release-', 'v'])).toBe('v1.2')
	expect(map('release-1.3', ['release-', 'v'])).toBe('v1.3')
	expect(map('release-1.4.0', ['release-', 'v'])).toBe('v1.4')
	expect(map('main', ['release-', 'v'])).toBe('next')
	expect(map('mimir-2.0.1', ['release-', 'mimir-'])).toBe('v2.0')

	expect(() => map('foo')).toThrow()
})
