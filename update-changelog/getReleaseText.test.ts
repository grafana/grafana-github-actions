import dotenv from 'dotenv'
import { expect } from 'chai'

describe('test', () => {
	dotenv.config()

	const token = process.env.TOKEN
	const repo = process.env.REPO
	const owner = process.env.OWNER

	const octokit = new OctoKit({ token, repo, owner })
})
