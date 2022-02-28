import { setFailed } from '@actions/core'
import { getRequiredInput } from '../common/utils'
import { setOutput} from '@actions/core'

let forcePrefix = "v"
let trimPrefixes : string[] = [
	"release-",
	"v",
]

let knownRefs = new Map<string,string> ([
	["main", "next"],
])

function setTarget(target : string) {
	console.log("Output target: " + target)
	setOutput("target", target)
}

function run() {
	try {
		var ref_name : string = getRequiredInput("ref_name")
		console.log("Input ref_name: " + ref_name)

		var target = knownRefs.get(ref_name)
		if (target != undefined) {
			setTarget(target)
			return
		}

		trimPrefixes.forEach(prefix => {
			if (ref_name.startsWith(prefix)) {
				ref_name = ref_name.slice(prefix.length)
			}
		});

		// The node semver package can't parse things like "x.y" without patch
		// https://github.com/npm/node-semver/issues/164#issuecomment-247157991
		// So doing cheap way to get major.minor
		let parts = ref_name.split(".", 2)
		if (parts.length != 2) {
			throw "ref_name invalid: " + ref_name
		}

		target = forcePrefix + parts[0] + "." + parts[1]
		setTarget(target)
	} catch (error : any) {
		setFailed(error);
	}
}

run()
