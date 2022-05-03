import { expect } from 'chai'
import { CheckConfig, getChecks } from './index'

describe('getChecks', () => {
	describe('without dependencies', () => {
		it('Should return checks based on config', async () => {
			const config = [
				{
					type: 'check-milestone',
				},
				{
					type: 'check-backport',
				},
			]
			const checks = getChecks(config as CheckConfig[])
			expect(checks[0]).to.not.be.undefined
			expect(checks[0].id).to.equal('check-milestone')
			expect(checks[1]).to.not.be.undefined
			expect(checks[1].id).to.equal('check-backport')
		})
	})

	describe('with dependencies', () => {
		it('Should return checks based on config', async () => {
			const config = [
				{
					type: 'check-milestone',
					dependencies: [{ type: 'status-check', title: 'test' }],
				},
				{
					type: 'check-backport',
				},
			]
			const checks = getChecks(config as CheckConfig[])
			expect(checks[0]).to.not.be.undefined
			expect(checks[0].id).to.equal('check-dependency-check/test')
			expect(checks[1]).to.not.be.undefined
			expect(checks[1].id).to.equal('check-backport')
		})
	})
})
