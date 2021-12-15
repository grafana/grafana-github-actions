import { expect } from 'chai'
import { getChecks } from './index'

describe('getChecks', () => {
	it('Should return checks based on config', async () => {
		const config = [
			{
				type: 'check-milestone',
			},
		]
		const checks = getChecks(config)
		expect(checks[0]).to.not.be.undefined
		expect(checks[0].id).to.equal('milestone')
	})
})
