import { coerce } from 'semver'

let forcePrefix = 'v'
let trimPrefixes: string[] = ['release-', 'v']
let knownRefs = new Map<string, string>([['main', 'next']])

// map the given git reference (branch or tag name) to the corresponding
// documentation subfolder. The output will be "vMajor.Minor"
export function map(ref: string): string {
	// Hard-coded mapping?
	if (knownRefs.has(ref)) {
		return knownRefs.get(ref)!
	}

	trimPrefixes.forEach((prefix) => {
		if (ref.startsWith(prefix)) {
			ref = ref.slice(prefix.length)
		}
	})

	var ver = coerce(ref)
	if (ver == null) {
		throw 'ref_name invalid: ' + ref
	}

	return forcePrefix + ver.major + '.' + ver.minor
}
