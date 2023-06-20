import { exec } from '@actions/exec'

export interface CloneProps {
	token: string
	owner: string
	repo: string
}

export interface ConfigProps {
	userEmail: string
	userName: string
}

const grafanaBotProps: ConfigProps = { userEmail: 'bot@grafana.com', userName: 'grafanabot' }
const grafanaDeliveryBotProps: ConfigProps = {
	userEmail: '132647405+grafana-delivery-bot[bot]@users.noreply.github.com',
	userName: 'grafana-delivery-bot[bot]',
}

export async function setConfig(botSlug: string) {
	let configProps: ConfigProps
	switch (botSlug) {
		case 'grafanabot':
			configProps = grafanaBotProps
			break
		case 'grafana-delivery-bot':
			configProps = grafanaDeliveryBotProps
			break
		default:
			throw Error(
				'Users available: grafanabot and grafana-delivery-bot, please add another user if that is the case',
			)
	}
	await exec('git', ['config', '--global', 'user.email', configProps.userEmail])
	await exec('git', ['config', '--global', 'user.name', configProps.userName])
}

export async function cloneRepo({ token, owner, repo }: CloneProps) {
	await exec('git', ['clone', `https://x-access-token:${token}@github.com/${owner}/${repo}.git`])
}
