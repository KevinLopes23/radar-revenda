import { describe, expect, it } from 'vitest'
import { canonicalUrl, parseBrlPrice, parseCard } from './extract'

describe('parseBrlPrice', () => {
  it.each([
    ['R$ 1.234,56', 1234.56],
    ['R$1.500', 1500],
    ['R$ 2.400', 2400],
    ['por R$ 89,90 à vista', 89.9],
    ['R$ 950', 950]
  ])('parses %s', (text, expected) => {
    expect(parseBrlPrice(text)).toBe(expected)
  })

  it('returns null without a price', () => {
    expect(parseBrlPrice('Grátis')).toBeNull()
  })
})

describe('canonicalUrl', () => {
  it('strips query and hash', () => {
    expect(canonicalUrl('https://www.enjoei.com.br/p/iphone-13-150873410?rsid=abc#x')).toBe(
      'https://www.enjoei.com.br/p/iphone-13-150873410'
    )
  })

  it('normalizes facebook item urls', () => {
    expect(canonicalUrl('https://www.facebook.com/marketplace/item/123456789/?ref=search&referral_code=x')).toBe(
      'https://www.facebook.com/marketplace/item/123456789/'
    )
  })
})

describe('parseCard', () => {
  it('parses an Enjoei card with discount (uses current price)', () => {
    const listing = parseCard(
      {
        url: 'https://www.enjoei.com.br/p/iphone-13-128gb-meia-noite-150873410?rsid=1',
        text: '3\n5\n34%\nR$ 1.650\nR$ 2.500\niphone 13 128gb meia noite\napple\nmarcos',
        image: 'https://photos.enjoei.com.br/x.jpg'
      },
      'enjoei',
      'iphone 13'
    )
    expect(listing).toMatchObject({
      id: 'enjoei:https://www.enjoei.com.br/p/iphone-13-128gb-meia-noite-150873410',
      platformId: 'enjoei',
      price: 1650,
      title: 'iphone 13 128gb meia noite',
      image: 'https://photos.enjoei.com.br/x.jpg'
    })
  })

  it('parses a Facebook card with location', () => {
    const listing = parseCard(
      { url: 'https://www.facebook.com/marketplace/item/42/?ref=x', text: 'R$ 1.500\niPhone 13 128GB azul\nBauru, SP', image: null },
      'facebook',
      'iphone 13'
    )
    expect(listing).toMatchObject({ price: 1500, title: 'iPhone 13 128GB azul', location: 'Bauru, SP' })
  })

  it('ignores marketing lines when choosing the title (Buscapé)', () => {
    const listing = parseCard(
      {
        url: 'https://www.buscape.com.br/celular/smartphone-apple-iphone-13-128gb-ios?_lc=88',
        text: 'Oferta do dia\niPhone 13 128GB 4GB\n4 (925)\nVia Americanas\nR$ 4.579,00\n0.5% de volta na loja toda\nCompare em 3 lojas',
        image: null
      },
      'buscape',
      'iphone 13'
    )
    expect(listing).toMatchObject({ price: 4579, title: 'iPhone 13 128GB 4GB' })
  })

  it('returns null when the card has no price', () => {
    expect(parseCard({ url: 'https://www.olx.com.br/d/x-1', text: 'Sem preço', image: null }, 'olx', 'x')).toBeNull()
  })

  it('falls back to the URL slug when the text has no title', () => {
    const listing = parseCard(
      { url: 'https://www.enjoei.com.br/p/iphone-13-rosa-128gb-154588647', text: 'R$ 2.150', image: null },
      'enjoei',
      'iphone 13'
    )
    expect(listing?.title).toBe('iphone 13 rosa 128gb')
  })
})
