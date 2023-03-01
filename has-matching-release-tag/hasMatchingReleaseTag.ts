import { execFileSync } from 'child_process'
import { splitStringIntoLines } from '../common/utils'

export function hasMatchingReleaseTag(
	refName: string,
	releaseTagRegexp: RegExp,
	releaseBranchRegexp: RegExp,
	releaseBranchWithPatchRegexp: RegExp | undefined,
): string {
	let refNames = splitStringIntoLines(execFileSync('git', ['tag'], { encoding: 'utf8' })).filter((e) => e)
	if (refNames.length == 0) {
		throw 'No tags found. Is there an `actions/checkout` step with `fetch-depth: 0` before this action? https://github.com/actions/checkout#fetch-all-history-for-all-tags-and-branches'
	}
	return hasMatchingReleaseTagWithRefNames(
		refNames,
		refName,
		releaseTagRegexp,
		releaseBranchRegexp,
		releaseBranchWithPatchRegexp,
	)
}

export function filterRefNames(refNames: Array<string>, regexp: RegExp): Array<string> {
	return refNames.filter((name) => name.match(regexp))
}

// hasMatchingReleaseTagWithRefNames returns either the string "true" or "false".
// "true" is returned for each of the following cases:
// - releaseTagRegexp matches refName and is therefore a release tag reference name.
// - releaseBranchRegexp matches refName and there is a corresponding reference name in
//   refNames that matched by releaseTagRegexp. For a reference name to be corresponding,
//   it must share the major and minor versions with refName, and it must have a '0'
//   patch version.
// - releaseBranchWithPatchRegexp is defined, matches refName, and there is a corresponding
//   reference name in matched by releaseTagRegexp. For a reference name to be corresponding,
//   it must share the major, minor, and patch versions with the refName.
// Otherwise, the function returns "false".
export function hasMatchingReleaseTagWithRefNames(
	refNames: Array<string>,
	refName: string,
	releaseTagRegexp: RegExp,
	releaseBranchRegexp: RegExp,
	releaseBranchWithPatchRegexp: RegExp | undefined,
): string {
	if (refName.match(releaseTagRegexp)) {
		console.log(`Reference name is a release tag`)
		return 'true'
	}

	let releaseTags = filterRefNames(refNames, releaseTagRegexp)

	let branchMatches = refName.match(releaseBranchRegexp)
	if (branchMatches) {
		for (let i = 0; i < releaseTags.length; i++) {
			let tagMatches = releaseTags[i].match(releaseTagRegexp)
			if (
				tagMatches &&
				tagMatches[1] == branchMatches[1] &&
				tagMatches[2] == branchMatches[2] &&
				tagMatches[3].match(new RegExp('0|[1-9]d*'))
			) {
				console.log(`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`)
				return 'true'
			}
		}
	}

	if (releaseBranchWithPatchRegexp) {
		branchMatches = refName.match(releaseBranchWithPatchRegexp)
		if (branchMatches) {
			for (let i = 0; i < releaseTags.length; i++) {
				let tagMatches = releaseTags[i].match(releaseTagRegexp)
				if (
					tagMatches &&
					tagMatches[1] == branchMatches[1] &&
					tagMatches[2] == branchMatches[2] &&
					tagMatches[3] == branchMatches[3]
				) {
					console.log(
						`Found corresponding release tag for branch '${refName}': '${releaseTags[i]}'`,
					)
					return 'true'
				}
			}
		}
	}

	console.log(`Did not find a corresponding release tag for reference '${refName}'`)
	return 'false'
}
