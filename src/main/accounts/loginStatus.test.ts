import { describe, expect, it } from 'vitest'
import { getPlatform } from '../../shared/platforms'
import { hasSessionCookies, isCheckpointUrl, resolveSavedStatus, type CookieLike } from './loginStatus'

const NOW = 1_800_000_000
const FB_COOKIES = ['c_user', 'xs']

const cookie = (overrides: Partial<CookieLike>): CookieLike => ({
  name: 'c_user',
  value: '123',
  domain: '.facebook.com',
  expires: NOW + 3600,
  ...overrides
})

const validFacebookSession: CookieLike[] = [cookie({ name: 'c_user' }), cookie({ name: 'xs', value: 'abc' })]

describe('hasSessionCookies', () => {
  it('returns true when all required cookies are present and valid', () => {
    expect(hasSessionCookies(validFacebookSession, FB_COOKIES, 'facebook.com', NOW)).toBe(true)
  })

  it('returns false when there are no cookies', () => {
    expect(hasSessionCookies([], FB_COOKIES, 'facebook.com', NOW)).toBe(false)
  })

  it('returns false when one required cookie is missing', () => {
    expect(hasSessionCookies([cookie({ name: 'c_user' })], FB_COOKIES, 'facebook.com', NOW)).toBe(false)
  })

  it('returns false when a required cookie has an empty value', () => {
    const cookies = [cookie({ name: 'c_user', value: '' }), cookie({ name: 'xs' })]
    expect(hasSessionCookies(cookies, FB_COOKIES, 'facebook.com', NOW)).toBe(false)
  })

  it('returns false when a required cookie is expired', () => {
    const cookies = [cookie({ name: 'c_user' }), cookie({ name: 'xs', expires: NOW - 1 })]
    expect(hasSessionCookies(cookies, FB_COOKIES, 'facebook.com', NOW)).toBe(false)
  })

  it('accepts browser-session cookies (expires = -1)', () => {
    const cookies = [cookie({ name: 'c_user', expires: -1 }), cookie({ name: 'xs', expires: -1 })]
    expect(hasSessionCookies(cookies, FB_COOKIES, 'facebook.com', NOW)).toBe(true)
  })

  it('accepts cookies from subdomains of the platform domain', () => {
    const cookies = validFacebookSession.map((c) => ({ ...c, domain: 'www.facebook.com' }))
    expect(hasSessionCookies(cookies, FB_COOKIES, 'facebook.com', NOW)).toBe(true)
  })

  it('ignores cookies from look-alike domains', () => {
    const cookies = validFacebookSession.map((c) => ({ ...c, domain: '.notfacebook.com' }))
    expect(hasSessionCookies(cookies, FB_COOKIES, 'facebook.com', NOW)).toBe(false)
  })

  it('returns false when no cookie names are required', () => {
    expect(hasSessionCookies(validFacebookSession, [], 'facebook.com', NOW)).toBe(false)
  })
})

describe('isCheckpointUrl', () => {
  it.each([
    'https://www.facebook.com/checkpoint/1501092823525282/',
    'https://www.facebook.com/two_step_verification/authentication/',
    'https://www.facebook.com/login/?next=%2Fmarketplace'
  ])('detects verification/login page %s', (url) => {
    expect(isCheckpointUrl(url)).toBe(true)
  })

  it('returns false for marketplace pages', () => {
    expect(isCheckpointUrl('https://www.facebook.com/marketplace/bauru/')).toBe(false)
  })

  it('returns false for checkpoint-like paths on other domains', () => {
    expect(isCheckpointUrl('https://example.com/checkpoint/1')).toBe(false)
  })

  it('returns false for invalid URLs', () => {
    expect(isCheckpointUrl('not a url')).toBe(false)
  })
})

describe('resolveSavedStatus', () => {
  const facebook = getPlatform('facebook')
  const olx = getPlatform('olx')
  const buscape = getPlatform('buscape')

  it('marks cookie-detected platform as connected when session cookies exist', () => {
    expect(resolveSavedStatus(facebook, validFacebookSession, undefined, NOW)).toBe('conectado')
  })

  it('marks cookie-detected platform as disconnected without session cookies', () => {
    expect(resolveSavedStatus(facebook, [], undefined, NOW)).toBe('desconectado')
  })

  it('ignores manual confirmation for cookie-detected platforms', () => {
    expect(resolveSavedStatus(facebook, [], '2026-11-10T00:00:00.000Z', NOW)).toBe('desconectado')
  })

  it('marks manual platform as connected when the user confirmed and cookies exist', () => {
    const olxCookies = [cookie({ name: 'anything', domain: '.olx.com.br' })]
    expect(resolveSavedStatus(olx, olxCookies, '2026-11-10T00:00:00.000Z', NOW)).toBe('conectado')
  })

  it('marks manual platform as disconnected when its cookies were cleared', () => {
    expect(resolveSavedStatus(olx, [], '2026-11-10T00:00:00.000Z', NOW)).toBe('desconectado')
  })

  it('marks manual platform as disconnected without confirmation', () => {
    const olxCookies = [cookie({ name: 'anything', domain: '.olx.com.br' })]
    expect(resolveSavedStatus(olx, olxCookies, undefined, NOW)).toBe('desconectado')
  })

  it('treats non-connectable platforms as always available', () => {
    expect(resolveSavedStatus(buscape, [], undefined, NOW)).toBe('conectado')
  })
})
