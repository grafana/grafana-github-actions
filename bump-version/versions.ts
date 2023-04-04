export function getVersionMatch(version: string): string[] | null {
	return version.match(/^(\d+.\d+).\d+(?:-(((beta)\d+)|(?:pre)))?$/)
}
