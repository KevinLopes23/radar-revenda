import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  parseOpportunityStatus,
  parsePurchaseInput,
  parseSaleInput,
  parseSearchInput,
  parseSearches,
  parseSettings
} from './validation'

describe('parseSearchInput', () => {
  const valid = { query: '  iphone 13  ', minPrice: 500, maxPrice: 2000, platforms: ['facebook', 'olx'], active: true }

  it('accepts and trims a valid search', () => {
    expect(parseSearchInput(valid)).toEqual({ ...valid, query: 'iphone 13' })
  })

  it('rejects a too short query', () => {
    expect(() => parseSearchInput({ ...valid, query: 'a' })).toThrow()
  })

  it('rejects min price above max price', () => {
    expect(() => parseSearchInput({ ...valid, minPrice: 3000 })).toThrow(/mínimo/)
  })

  it('rejects platforms that do not search offers', () => {
    expect(() => parseSearchInput({ ...valid, platforms: ['buscape'] })).toThrow()
  })

  it('rejects an empty platform list', () => {
    expect(() => parseSearchInput({ ...valid, platforms: [] })).toThrow()
  })

  it('removes duplicated platforms', () => {
    expect(parseSearchInput({ ...valid, platforms: ['olx', 'olx'] }).platforms).toEqual(['olx'])
  })
})

describe('parseSearches', () => {
  it('drops invalid stored entries', () => {
    const stored = [
      { id: 'a', query: 'ps5', minPrice: null, maxPrice: null, platforms: ['olx'], active: true, createdAt: '2026-11-10T00:00:00.000Z', lastRunAt: null },
      { id: 'b', query: 1 }
    ]
    expect(parseSearches(stored).map((s) => s.id)).toEqual(['a'])
  })

  it('returns empty list for non-array data', () => {
    expect(parseSearches({})).toEqual([])
  })
})

describe('parsePurchaseInput / parseSaleInput', () => {
  it('accepts a purchase', () => {
    const input = { title: 'iPhone 13', platformId: 'facebook', paidPrice: 1500, listingUrl: null, opportunityId: null, notes: '' }
    expect(parsePurchaseInput(input)).toEqual(input)
  })

  it('rejects negative prices', () => {
    expect(() => parseSaleInput({ soldPrice: -1, soldChannel: 'olx' })).toThrow()
  })

  it('rejects non-https listing urls', () => {
    expect(() =>
      parsePurchaseInput({ title: 'x y', platformId: 'olx', paidPrice: 1, listingUrl: 'javascript:alert(1)', opportunityId: null, notes: '' })
    ).toThrow()
  })
})

describe('parseSettings', () => {
  it('returns defaults for empty input', () => {
    expect(parseSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('keeps valid overrides and fills missing fields', () => {
    const parsed = parseSettings({ quickSaleDiscountPct: 10, scan: { intervalMinutes: 90 } })
    expect(parsed.quickSaleDiscountPct).toBe(10)
    expect(parsed.scan.intervalMinutes).toBe(90)
    expect(parsed.scan.maxPerPlatform).toBe(DEFAULT_SETTINGS.scan.maxPerPlatform)
  })

  it('rejects an interval shorter than 30 minutes', () => {
    expect(() => parseSettings({ scan: { intervalMinutes: 5 } })).toThrow()
  })

  it('has default Mercado Livre fees', () => {
    expect(DEFAULT_SETTINGS.fees.mercadolivre.percent).toBeGreaterThan(0)
  })
})

describe('parseOpportunityStatus', () => {
  it('accepts known statuses', () => {
    expect(parseOpportunityStatus('descartada')).toBe('descartada')
  })

  it('rejects unknown statuses', () => {
    expect(() => parseOpportunityStatus('apagada')).toThrow()
  })
})
