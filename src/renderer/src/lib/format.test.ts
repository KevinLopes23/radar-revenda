import { describe, expect, it } from 'vitest'
import { brl, errorMessage, parseMoney, platformName, timeAgo } from './format'

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

describe('platformName', () => {
  it('returns the display name', () => {
    expect(platformName('mercadolivre')).toBe('Mercado Livre')
  })
})
