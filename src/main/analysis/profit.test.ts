import { describe, expect, it } from 'vitest'
import type { ChannelFee } from '../../shared/types'
import { channelProfit, computeChannels, liquidityOf, scoreOpportunity } from './profit'

const noFee: ChannelFee = { percent: 0, fixed: 0, shipping: 0 }
const mlFee: ChannelFee = { percent: 14, fixed: 6, shipping: 0 }

describe('channelProfit', () => {
  it('subtracts commission, fixed fee, shipping, cost and extra cost', () => {
    expect(channelProfit({ salePrice: 1000, fee: { percent: 10, fixed: 5, shipping: 20 }, cost: 600, extraCost: 15 })).toEqual({
      fees: 125,
      profit: 260
    })
  })

  it('rounds to cents', () => {
    expect(channelProfit({ salePrice: 99.99, fee: { percent: 13.5, fixed: 0, shipping: 0 }, cost: 50, extraCost: 0 }).fees).toBe(13.5)
  })
})

describe('computeChannels', () => {
  it('applies the quick-sale discount and sorts channels by profit', () => {
    const channels = computeChannels({
      marketPrice: 2000,
      quickSaleDiscountPct: 5,
      cost: 1500,
      extraCost: 0,
      fees: { facebook: noFee, mercadolivre: mlFee },
      channels: ['mercadolivre', 'facebook']
    })
    expect(channels.map((c) => c.platformId)).toEqual(['facebook', 'mercadolivre'])
    expect(channels[0]).toEqual({ platformId: 'facebook', salePrice: 1900, fees: 0, profit: 400 })
    expect(channels[1]?.profit).toBe(128)
  })

  it('skips channels without configured fees', () => {
    const channels = computeChannels({
      marketPrice: 1000,
      quickSaleDiscountPct: 0,
      cost: 500,
      extraCost: 0,
      fees: { facebook: noFee },
      channels: ['facebook', 'olx']
    })
    expect(channels).toHaveLength(1)
  })
})

describe('scoreOpportunity', () => {
  it('gives a high score to a big, confident, safe margin', () => {
    expect(scoreOpportunity({ profit: 500, cost: 1000, comparablesCount: 8, flags: [] })).toBeGreaterThanOrEqual(9)
  })

  it('gives zero when there is no profit', () => {
    expect(scoreOpportunity({ profit: -50, cost: 1000, comparablesCount: 8, flags: [] })).toBe(0)
  })

  it('penalizes high risk flags', () => {
    const safe = scoreOpportunity({ profit: 300, cost: 1000, comparablesCount: 5, flags: [] })
    const risky = scoreOpportunity({ profit: 300, cost: 1000, comparablesCount: 5, flags: [{ level: 'alto', text: 'x' }] })
    expect(risky).toBeLessThan(safe - 2)
  })

  it('stays within 0 and 10', () => {
    const score = scoreOpportunity({ profit: 100000, cost: 1, comparablesCount: 100, flags: [{ level: 'bom', text: 'x' }] })
    expect(score).toBeLessThanOrEqual(10)
  })

  it('returns zero when profit is unknown', () => {
    expect(scoreOpportunity({ profit: null, cost: 1000, comparablesCount: 0, flags: [] })).toBe(0)
  })
})

describe('liquidityOf', () => {
  it('rates how many used units of the same model are for sale', () => {
    expect(liquidityOf(10)).toBe('alta')
    expect(liquidityOf(5)).toBe('media')
    expect(liquidityOf(2)).toBe('baixa')
  })
})

describe('scoreOpportunity with liquidity', () => {
  it('penalizes products that are hard to resell', () => {
    const base = { profit: 300, cost: 1000, comparablesCount: 5, flags: [] }
    expect(scoreOpportunity({ ...base, liquidity: 'baixa' })).toBeLessThan(scoreOpportunity({ ...base, liquidity: 'alta' }))
  })
})
