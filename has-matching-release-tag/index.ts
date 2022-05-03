import { setOutput, setFailed } from '@actions/core'
import { getInput, getRequiredInput, splitStringIntoLines } from '../common/utils'
import { hasMatchingReleaseTag } from './hasMatchingReleaseTag'

function prefixLines(prefix: string, lines: Array<string>): Array<string> {
	return lines.map((l) => `${prefix}${l}`)
}

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
	// Failed to spawn child process from execFileSync call.
	if (error.code) {
		setFailed(error.code)
	}

	// Child was spawned but exited with non-zero exit code.
	if (error.stdout || error.stderr) {
		const { stdout, stderr } = error
		setFailed(
			prefixLines('stdout: ', splitStringIntoLines(stdout))
				.concat(prefixLines('stderr: ', splitStringIntoLines(stderr)))
				.join('\n'),
		)
	}

	// Some other error was thrown.
	setFailed(error)
}
