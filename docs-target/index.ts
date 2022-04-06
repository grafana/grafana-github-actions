import { setOutput, setFailed } from '@actions/core'
import { getRequiredInput } from '../common/utils'
import { map } from './map'

try {
	var ref = getRequiredInput('ref_name')
	var trimPrefixes = getRequiredInput('trim_prefixes').split(':')
	console.log('Input ref_name: ' + ref)

	let target = map(ref, trimPrefixes)

	console.log('Output target: ' + target)
	setOutput('target', target)
} catch (error: any) {
	setFailed(error)
}
