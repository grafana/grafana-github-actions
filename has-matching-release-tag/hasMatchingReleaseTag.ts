import { exec, ExecOptions } from '@actions/exec'

export async function hasMatchingReleaseTag(
	refName: string,
	releaseTagRegexp: RegExp,
	releaseBranchWithoutPatchRegexp: RegExp,
	releaseBranchWithPatchRegexp: RegExp,
): Promise<string> {
	let refNames: Array<string> = []
	const options: ExecOptions = {
		listeners: {
			stdout: (data: Buffer) => {
				refNames = data.toString().split(/(?:\r\n|\r|\n)/g)
			},
		},
	}

	await exec('git', ['tag'], options)

	return hasMatchingReleaseTagWithRefNames(
		refNames,
		refName,
		releaseTagRegexp,
		releaseBranchWithoutPatchRegexp,
		releaseBranchWithPatchRegexp,
	)
}

export function filterRefNames(refNames: Array<string>, regexp: RegExp): Array<string> {
	return refNames.filter((name) => name.match(regexp))
}

export function hasMatchingReleaseTagWithRefNames(
	refNames: Array<string>,
	refName: string,
	releaseTagRegexp: RegExp,
	releaseBranchWithoutPatchRegexp: RegExp,
	releaseBranchWithPatchRegexp: RegExp,
): string {
	if (refName.match(releaseTagRegexp)) {
		return 'true'
	}

	let releaseTags = filterRefNames(refNames, releaseTagRegexp)

	let branchMatches = refName.match(releaseBranchWithPatchRegexp)
	if (branchMatches) {
		for (var i = 0; i < releaseTags.length; i++) {
			let tagMatches = releaseTags[i].match(releaseTagRegexp)
			if (
				tagMatches &&
				tagMatches[1] == branchMatches[1] &&
				tagMatches[2] == branchMatches[2] &&
				tagMatches[3] == branchMatches[3]
			) {
				return 'true'
			}
		}
	}

	branchMatches = refName.match(releaseBranchWithoutPatchRegexp)
	if (branchMatches) {
		for (var i = 0; i < releaseTags.length; i++) {
			let tagMatches = releaseTags[i].match(releaseTagRegexp)
			if (
				tagMatches &&
				tagMatches[1] == branchMatches[1] &&
				tagMatches[2] == branchMatches[2] &&
				tagMatches[3] == '0'
			) {
				return 'true'
			}
		}
	}

	return 'false'
}
