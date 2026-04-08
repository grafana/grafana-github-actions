import { setOutput, setFailed } from '@actions/core'
import { getRequiredInput } from '../common/utils'
import { map } from './map'

try {
	const ref = getRequiredInput('ref_name')
	console.log('Input ref_name: ' + ref)

	const target = map(ref)

	console.log('Output target: ' + target)
	setOutput('target', target)
} catch (error: any) {
	setFailed(error)
}
