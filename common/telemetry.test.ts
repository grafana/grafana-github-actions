import { aiHandle } from './telemetry'

describe('Telemetry', () => {
	it.skip('should work', () => {
		aiHandle!.trackMetric({
			name: 'action-metric-test',
			value: 10,
		})
	})
})
