import { describe, expect, it } from 'vitest'
import { buildSearchUrl, detectBlock, isItemUrl, isTrustedItemUrl } from './sources'

describe('isTrustedItemUrl', () => {
  it('accepts https item links on the platform domain', () => {
    expect(isTrustedItemUrl('olx', 'https://sp.olx.com.br/regiao-de-bauru/celulares/iphone-13-1234567890')).toBe(true)
  })

  it('rejects look-alike links on other domains', () => {
    expect(isTrustedItemUrl('olx', 'https://evil.com/?x=olx.com.br/a-1234567')).toBe(false)
    expect(isTrustedItemUrl('enjoei', 'https://enjoei.com.br.evil.com/p/iphone-13-150873410')).toBe(false)
  })

  it('rejects non-https links', () => {
    expect(isTrustedItemUrl('enjoei', 'http://www.enjoei.com.br/p/iphone-13-150873410')).toBe(false)
  })

  it('rejects invalid urls', () => {
    expect(isTrustedItemUrl('enjoei', 'nada')).toBe(false)
  })
})

const query = { query: 'iphone 13', minPrice: 500, maxPrice: 2000 }

describe('buildSearchUrl', () => {
  it('builds Facebook Marketplace search with price range', () => {
    expect(buildSearchUrl('facebook', query, '')).toBe(
      'https://www.facebook.com/marketplace/search/?query=iphone+13&minPrice=500&maxPrice=2000&sortBy=creation_time_descend'
    )
  })

  it('builds OLX search for Brazil when no region is set', () => {
    expect(buildSearchUrl('olx', query, '')).toBe('https://www.olx.com.br/brasil?q=iphone+13&sf=1&ps=500&pe=2000')
  })

  it('builds OLX search for a region', () => {
    expect(buildSearchUrl('olx', { query: 'ps5', minPrice: null, maxPrice: null }, 'estado-sp/regiao-de-bauru-e-marilia')).toBe(
      'https://www.olx.com.br/estado-sp/regiao-de-bauru-e-marilia?q=ps5&sf=1'
    )
  })

  it('builds Mercado Livre search with slug', () => {
    expect(buildSearchUrl('mercadolivre', { query: 'iPhone 13 128GB', minPrice: null, maxPrice: null }, '')).toBe(
      'https://lista.mercadolivre.com.br/iphone-13-128gb'
    )
  })

  it('builds Enjoei, Shopee and Buscapé searches', () => {
    expect(buildSearchUrl('enjoei', query, '')).toBe('https://www.enjoei.com.br/s?q=iphone+13&pg=500&pl=2000')
    expect(buildSearchUrl('shopee', query, '')).toBe('https://shopee.com.br/search?keyword=iphone+13&minPrice=500&maxPrice=2000')
    expect(buildSearchUrl('buscape', query, '')).toBe('https://www.buscape.com.br/search?q=iphone+13')
  })

  it('rejects region paths with unsafe characters', () => {
    expect(buildSearchUrl('olx', query, '../../evil?x=1')).toBe('https://www.olx.com.br/brasil?q=iphone+13&sf=1&ps=500&pe=2000')
  })
})

describe('isItemUrl', () => {
  it.each([
    ['facebook', 'https://www.facebook.com/marketplace/item/123456/'],
    ['olx', 'https://sp.olx.com.br/regiao-de-bauru/celulares/iphone-13-1234567890'],
    ['mercadolivre', 'https://produto.mercadolivre.com.br/MLB-123456789-iphone-13-_JM'],
    ['mercadolivre', 'https://www.mercadolivre.com.br/apple-iphone-13/p/MLB18500844'],
    ['enjoei', 'https://www.enjoei.com.br/p/iphone-13-150873410'],
    ['shopee', 'https://shopee.com.br/iPhone-13-i.123.456'],
    ['buscape', 'https://www.buscape.com.br/celular/smartphone-apple-iphone-13-128gb-ios']
  ] as const)('recognizes %s item url', (platform, url) => {
    expect(isItemUrl(platform, url)).toBe(true)
  })

  it('rejects navigation links', () => {
    expect(isItemUrl('enjoei', 'https://www.enjoei.com.br/@enjoei-pro?b=zara')).toBe(false)
    expect(isItemUrl('facebook', 'https://www.facebook.com/marketplace/category/electronics')).toBe(false)
  })
})

describe('detectBlock', () => {
  it.each([
    ['https://www.olx.com.br/brasil', 'Attention Required! | Cloudflare'],
    ['https://www.buscape.com.br/search', 'ERROR: The request could not be satisfied'],
    ['https://www.mercadolivre.com.br/gz/account-verification?go=x', 'Mercado Libre'],
    ['https://shopee.com.br/verify/traffic/error?x=1', 'Shopee'],
    ['https://www.facebook.com/login/?next=x', 'Facebook'],
    ['https://www.facebook.com/checkpoint/123/', 'Facebook']
  ])('detects block at %s', (url, title) => {
    expect(detectBlock(url, title)).not.toBeNull()
  })

  it('returns null for normal pages', () => {
    expect(detectBlock('https://www.enjoei.com.br/s?q=x', 'Enjoei')).toBeNull()
  })
})
