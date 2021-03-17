import * as micromatch from 'micromatch'

export interface MatchConfig {
	all?: string[]
	any?: string[]
}

function isMatch(input: string, matchers: ((str: string) => boolean)[]): boolean {
	for (const matcher of matchers) {
		if (matcher(input)) {
			return true
		}
	}

	return false
}

// equivalent to "Array.some()" but expanded for debugging and clarity
function checkAny(inputs: string[], globs: string[]): boolean {
	const matchers = globs.map((g) => micromatch.matcher(g))
	for (const changedFile of inputs) {
		if (isMatch(changedFile, matchers)) {
			return true
		}
	}

	return false
}

// equivalent to "Array.every()" but expanded for debugging and clarity
function checkAll(inputs: string[], globs: string[]): boolean {
	const matchers = globs.map((g) => micromatch.matcher(g))
	for (const changedFile of inputs) {
		if (!isMatch(changedFile, matchers)) {
			return false
		}
	}

	return true
}

export function checkMatch(inputs: string[], matchConfig: MatchConfig): boolean {
	if (matchConfig.all !== undefined) {
		if (!checkAll(inputs, matchConfig.all)) {
			return false
		}
	}

	if (matchConfig.any !== undefined) {
		if (!checkAny(inputs, matchConfig.any)) {
			return false
		}
	}

	return true
}
