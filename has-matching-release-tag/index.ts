import { setOutput, setFailed } from '@actions/core'
import { getRequiredInput } from '../common/utils'
import { hasMatchingReleaseTag } from './hasMatchingReleaseTag'
;(async () => {
	try {
		let refName = getRequiredInput('ref_name')
		console.log('Input ref_name: ' + refName)
		let releaseTagRegexp = new RegExp(getRequiredInput('release_tag_regexp'))
		let releaseBranchWithoutPatchRegexp = new RegExp(
			getRequiredInput('release_branch_without_patch_regexp'),
		)
		let releaseBranchWithPatchRegexp = new RegExp(getRequiredInput('release_branch_with_patch_regexp'))

		let bool = await hasMatchingReleaseTag(
			refName,
			releaseTagRegexp,
			releaseBranchWithoutPatchRegexp,
			releaseBranchWithPatchRegexp,
		)
		console.log('Output bool: ' + bool)
		setOutput('bool', bool)
	} catch (error: any) {
		setFailed(error)
	}
})()
