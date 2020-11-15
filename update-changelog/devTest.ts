import dotenv from 'dotenv'
import { OctoKit } from '../api/octokit'
import { getReleaseText } from './getReleaseText'

dotenv.config()

const token = process.env.TOKEN as string
const repo = process.env.REPO as string
const owner = process.env.OWNER as string

const octokit = new OctoKit(token, { repo, owner }, { readonly: false })

async function devTest() {
	const releastText = await getReleaseText(octokit, 204)
	console.log('releaseText', releastText)
}

devTest()
