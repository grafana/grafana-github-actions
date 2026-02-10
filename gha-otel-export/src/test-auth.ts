import * as dotenv from 'dotenv'
import { Octokit } from '@octokit/rest'
import { execSync } from 'child_process'

dotenv.config()

async function testAuth() {
	console.log('🔐 Testing GitHub Authentication\n')
	const token = execSync('gh auth token', { encoding: 'utf8' }).trim()

	console.log('🧪 Testing API access...')
	const octokit = new Octokit({
		auth: token,
	})

	try {
		const { data, headers } = await octokit.rest.users.getAuthenticated()

		console.log('✅ Authentication successful!\n')
		console.log('👤 User Information:')
		console.log(`   Username: ${data.login}`)
		console.log(`   Name: ${data.name || 'N/A'}`)
		console.log(`   Type: ${data.type}`)
		console.log()

		// Parse OAuth scopes
		const scopesHeader = headers['x-oauth-scopes'] || ''
		const scopes = scopesHeader
			.split(',')
			.map((s: string) => s.trim())
			.filter(Boolean)

		console.log('🔑 Token Scopes:')
		if (scopes.length > 0) {
			scopes.forEach((scope) => console.log(`   - ${scope}`))
		} else {
			console.log('   (no scopes found in header)')
		}
		console.log()

		// Check required scopes
		const requiredScopes = ['repo', 'read:org']
		const missingScopes = requiredScopes.filter((s) => !scopes.includes(s))

		if (missingScopes.length > 0) {
			console.log('⚠️  Missing recommended scopes:')
			missingScopes.forEach((scope) => console.log(`   - ${scope}`))
			console.log()
			console.log('To add missing scopes, run:')
			console.log(`   gh auth refresh -h github.com -s ${requiredScopes.join(' -s ')}`)
			console.log()
		}
		const testRepo = process.argv[2]
		if (testRepo) {
			console.log(`🧪 Testing access to repository: ${testRepo}`)
			const [owner, repo] = testRepo.split('/')

			try {
				const repoData = await octokit.rest.repos.get({ owner, repo })
				console.log(`✅ Can access ${testRepo}`)
				console.log(
					`   Visibility: ${repoData.data.visibility || repoData.data.private ? 'private' : 'public'}`,
				)

				// Test actions access
				try {
					const workflows = await octokit.rest.actions.listRepoWorkflows({ owner, repo })
					console.log(`✅ Can access Actions (${workflows.data.total_count} workflows found)`)
				} catch (err: any) {
					console.log(`❌ Cannot access Actions: ${err.message}`)
				}
			} catch (err: any) {
				console.log(`❌ Cannot access repository: ${err.message}`)
				if (err.status === 404) {
					console.log('   This could mean:')
					console.log('   - Repository does not exist')
					console.log('   - You do not have access to this repository')
					console.log('   - Token does not have required scopes')
				}
			}
		} else {
			console.log('💡 Tip: Test specific repo access by providing owner/repo as argument')
			console.log('   Example: npm run test-auth grafana/grafana-enterprise')
		}
	} catch (error: any) {
		console.error('❌ Authentication failed!\n')
		console.error(`Error: ${error.message}`)
		if (error.status) {
			console.error(`Status: ${error.status}`)
		}
		if (error.response?.data) {
			console.error(`Details: ${JSON.stringify(error.response.data, null, 2)}`)
		}
		process.exit(1)
	}
}

testAuth().catch((error) => {
	console.error('Fatal error:', error)
	process.exit(1)
})
