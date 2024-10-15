import * as core from '@actions/core'
import { getInput, getRequiredInput, splitStringIntoLines } from '../common/utils'
import { hasMatchingReleaseTag } from './hasMatchingReleaseTag'

function prefixLines(prefix: string, lines: Array<string>): Array<string> {
	return lines.map((l) => `${prefix}${l}`)
}

try {
	const refName = getRequiredInput('ref_name')
	const withPath = getInput('release_branch_with_patch_regexp')

	core.info('Input ref_name: ' + refName)

	const hasMatchingBool = hasMatchingReleaseTag(
		refName,
		new RegExp(getRequiredInput('release_tag_regexp')),
		new RegExp(getRequiredInput('release_branch_regexp')),
		withPath ? new RegExp(withPath) : undefined,
	)

	core.info('Output bool: ' + hasMatchingBool)

	core.setOutput('bool', hasMatchingBool)
} catch (error: any) {
	// Failed to spawn child process from execFileSync call.
	if (error.code) {
		core.setFailed(error.code)
	}

	// Child was spawned but exited with non-zero exit code.
	if (error.stdout || error.stderr) {
		const { stdout, stderr } = error
		core.setFailed(
			prefixLines('stdout: ', splitStringIntoLines(stdout))
				.concat(prefixLines('stderr: ', splitStringIntoLines(stderr)))
				.join('\n'),
		)
	}

	// Some other error was thrown.
	core.setFailed(error)
}
