import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'
import eslintPluginPrettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
	{
		ignores: [
			'**/node_modules/**',
			'**/*.js',
			'**/*.cjs',
			'**/*.mjs',
			'**/dist/**',
			'gha-otel-export/**',
			'.github/**',
			'__mocks__/**',
		],
	},
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	eslintPluginPrettier,
	{
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*/*.test.ts'],
					defaultProject: 'tsconfig.test.json',
					maximumDefaultProjectFileMatchCount_THIS_WILL_SLOW_DOWN_LINTING: 20,
				},
				tsconfigRootDir: import.meta.dirname,
			},
		},
		rules: {
			'no-unused-vars': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unused-vars': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': [
				'error',
				{
					checksVoidReturn: false,
				},
			],
			'prettier/prettier': 'error',
		},
	},
)
