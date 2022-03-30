import { setOutput, setFailed } from '@actions/core'
import { getRequiredInput } from '../common/utils'
import { coerce } from 'semver'

let forcePrefix = 'v'
let trimPrefixes: string[] = ['release-', 'v']
let knownRefs = new Map<string, string>([['main', 'next']])

function setTarget(target: string) {
	console.log('Output target: ' + target)
	setOutput('target', target)
}

function run() {
	try {
		var ref = getRequiredInput('ref_name')
		console.log('Input ref_name: ' + ref)

		if (knownRefs.has(ref)) {
			setTarget(knownRefs.get(ref)!)
			return
		}

		trimPrefixes.forEach((prefix) => {
			if (ref.startsWith(prefix)) {
				ref = ref.slice(prefix.length)
			}
		})

		var ver = coerce(ref)
		if (ver == null) {
			throw 'ref_name invalid: ' + ref
		}
		setTarget(forcePrefix + ver.major + '.' + ver.minor)
	} catch (error: any) {
		setFailed(error)
	}
}

run()
