import { map } from './map'

test('mappings', () => {
	expect(map('v1.2.3')).toBe('v1.2')
	expect(map('release-1.3')).toBe('v1.3')
	expect(map('main')).toBe('next')

	expect(() => map('foo')).toThrow()
})
