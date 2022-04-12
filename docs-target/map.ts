import { coerce } from 'semver'

let forcePrefix = 'v'
let knownRefs = new Map<string, string>([
	['main', 'next'],
	['master', 'next'],
])

// map the given git reference (branch or tag name) to the corresponding
// documentation subfolder.
// The output will be "vMajor.Minor".
// The coercion performed is very permissive and most any reference will
// result in some output.
// All references that approximate semantic version, but deviate perhaps
// by having a prefix, should be coerced into a reasonable output.
export function map(ref: string): string {
	// Hard-coded mapping?
	if (knownRefs.has(ref)) {
		return knownRefs.get(ref)!
	}

	var ver = coerce(ref)
	if (ver == null) {
		throw 'ref_name invalid: ' + ref
	}

	return forcePrefix + ver.major + '.' + ver.minor
}
