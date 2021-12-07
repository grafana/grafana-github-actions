module.exports = {
	verbose: false,
	transform: {
		'^.+\\.(ts|tsx|js|jsx)$': 'ts-jest',
	},
	moduleDirectories: ['node_modules'],
	testRegex: '(\\.|/)(test)\\.(jsx?|tsx?)$',
	moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
	globals: { 'ts-jest': { isolatedModules: true } },
	watchPathIgnorePatterns: ['<rootDir>/node_modules/'],    
}
