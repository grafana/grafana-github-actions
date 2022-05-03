import { setOutput, setFailed } from '@actions/core'
import { getInput, getRequiredInput } from '../common/utils'
import { hasMatchingReleaseTag } from './hasMatchingReleaseTag'

try {
	let refName = getRequiredInput('ref_name')
	console.log('Input ref_name: ' + refName)

	let withPath = getInput('release_branch_with_patch_regexp')
	let bool = hasMatchingReleaseTag(
		refName,
		new RegExp(getRequiredInput('release_tag_regexp')),
		new RegExp(getRequiredInput('release_branch_regexp')),
		withPath ? new RegExp(withPath) : undefined,
	)
	console.log('Output bool: ' + bool)
	setOutput('bool', bool)
} catch (error: any) {
	setFailed(error)
}
