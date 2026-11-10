import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../../../main/data/validation'
import { brl, errorMessage, netSaleProfit, parseMoney, platformName, timeAgo } from './format'

describe('brl', () => {
  it('formats Brazilian currency', () => {
    expect(brl(1234.5).replace(/\s/g, ' ')).toBe('R$ 1.234,50')
  })

  it('shows a dash for null', () => {
    expect(brl(null)).toBe('—')
  })
})

describe('parseMoney', () => {
  it.each([
    ['1.234,56', 1234.56],
    ['1500', 1500],
    ['R$ 2.000', 2000],
    ['89,9', 89.9]
  ])('parses %s', (text, expected) => {
    expect(parseMoney(text)).toBe(expected)
  })

  it('returns null for empty or invalid text', () => {
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('abc')).toBeNull()
  })
})

describe('timeAgo', () => {
  const now = Date.parse('2026-11-10T12:00:00.000Z')

  it.each([
    ['2026-11-10T11:59:40.000Z', 'agora'],
    ['2026-11-10T11:45:00.000Z', 'há 15 min'],
    ['2026-11-10T09:00:00.000Z', 'há 3 h'],
    ['2026-11-08T12:00:00.000Z', 'há 2 dias']
  ])('formats %s', (iso, expected) => {
    expect(timeAgo(iso, now)).toBe(expected)
  })

  it('handles null', () => {
    expect(timeAgo(null, now)).toBe('nunca')
  })
})

describe('errorMessage', () => {
  it('strips the Electron IPC prefix', () => {
    expect(errorMessage(new Error("Error invoking remote method 'searches:create': Error: Digite pelo menos 2 letras"))).toBe(
      'Digite pelo menos 2 letras'
    )
  })
})

describe('netSaleProfit', () => {
  const base = { id: '1', title: 'x', platformId: 'facebook', paidPrice: 1000, listingUrl: null, opportunityId: null, notes: '', boughtAt: '2026-11-10T00:00:00.000Z', soldAt: null } as const
  const fees = { ...DEFAULT_SETTINGS.fees, mercadolivre: { percent: 10, fixed: 5, shipping: 20 } }

  it('returns null while not sold', () => {
    expect(netSaleProfit({ ...base, soldPrice: null, soldChannel: null }, fees)).toBeNull()
  })

  it('subtracts the fees of the sale channel', () => {
    expect(netSaleProfit({ ...base, soldPrice: 1500, soldChannel: 'mercadolivre' }, fees)).toBe(325)
  })

  it('works without fees loaded', () => {
    expect(netSaleProfit({ ...base, soldPrice: 1500, soldChannel: 'olx' }, null)).toBe(500)
  })
})

describe('platformName', () => {
  it('returns the display name', () => {
    expect(platformName('mercadolivre')).toBe('Mercado Livre')
  })
})
