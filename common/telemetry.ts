/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getInput } from './utils'
import { GitHubIssue } from '../api/api'
import axios from 'axios'
import { context } from '@actions/github'

export interface TelemetryClient {
	trackMetric: (metric: TelemetryMetric) => void
	trackException: (arg: any) => void
}

export interface TelemetryMetric {
	name: string
	value: number
	labels?: Record<string, any>
	type?: string
}

export let aiHandle: TelemetryClient | undefined = undefined

const apiKey = getInput('metricsWriteAPIKey')

if (apiKey) {
	aiHandle = {
		trackException: (arg: any) => {
			console.log('trackException', arg)
		},
		trackMetric: (metric: TelemetryMetric) => {
			console.log(`trackMetric ${metric.name} ${metric.value}`)

			const tags = []

			if (metric.labels) {
				for (const key of Object.keys(metric.labels)) {
					const safeKey = key.replace(' ', '_').replace('/', '_')
					const safeValue = metric.labels[key].replace(' ', '_').replace('/', '_')
					tags.push(`${safeKey}=${safeValue}`)
				}
			}

			axios({
				url: 'https://graphite-us-central1.grafana.net/metrics',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				auth: {
					username: '6371',
					password: apiKey as string,
				},
				data: JSON.stringify([
					{
						name: `${getMetricsNamePrefix()}.${metric.name}`,
						value: metric.value,
						interval: 60,
						mtype: metric.type ?? 'count',
						time: Math.floor(new Date().valueOf() / 1000),
						tags,
					},
				]),
			}).catch((e) => {
				console.log(e)
			})
		},
	}
}

function getMetricsNamePrefix() {
	if (!context || context.repo.repo === 'grafana') {
		// this is for grafana repo, did not make this multi repo at the start and do not want to lose past metrics
		return 'gh_action'
	}
	return `repo_stats.${context.repo.repo}`
}

export const trackEvent = async (issue: GitHubIssue, event: string, props?: Record<string, string>) => {
	console.debug('tracking event', issue, event, props)
}
