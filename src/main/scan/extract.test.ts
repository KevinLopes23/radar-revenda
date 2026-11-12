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

  it('uses the current price, not the old price or the installment (Mercado Livre)', () => {
    const listing = parseCard(
      {
        url: 'https://produto.mercadolivre.com.br/MLB-123456789-iphone-13',
        text: 'R$ 3.999\nR$ 3.499\n10x R$ 349,90 sem juros\nFrete grátis acima de R$ 79\nApple iPhone 13 128GB',
        image: null
      },
      'mercadolivre',
      'iphone 13'
    )
    expect(listing?.price).toBe(3499)
  })

  it('handles two prices glued on one line (Facebook discount)', () => {
    const listing = parseCard(
      { url: 'https://www.facebook.com/marketplace/item/7/', text: 'R$1.500R$1.800\niPhone 13', image: null },
      'facebook',
      'iphone 13'
    )
    expect(listing?.price).toBe(1500)
  })

  it('limits the title length', () => {
    const listing = parseCard(
      { url: 'https://www.enjoei.com.br/p/x-1', text: `R$ 10\niphone ${'a'.repeat(500)}`, image: null },
      'enjoei',
      'iphone'
    )
    expect(listing?.title.length).toBeLessThanOrEqual(300)
  })

  it('returns null when the card has no price', () => {
    expect(parseCard({ url: 'https://www.olx.com.br/d/x-1', text: 'Sem preço', image: null }, 'olx', 'x')).toBeNull()
  })

  it('uses the first line, not the longer neighborhood line, when no line matches the query (OLX)', () => {
    const listing = parseCard(
      {
        url: 'https://sp.olx.com.br/regiao-de-sao-jose-do-rio-preto/games/consoles-de-video-game/playstation-4-slim-500gb-1552140578',
        text: "PlayStation 4 slim 500Gb\nR$ 1.150\n\nEstrela D'Oeste, Jardim São Paulo\n\nHoje, 18:50\n\nSlide 1\nSlide 2\nAdicionar aos favoritos",
        image: null
      },
      'olx',
      'ps4'
    )
    expect(listing?.title).toBe('PlayStation 4 slim 500Gb')
  })

  it('keeps a 3-letter title like Ps4 instead of the neighborhood (OLX)', () => {
    const listing = parseCard(
      {
        url: 'https://sp.olx.com.br/sao-paulo-e-regiao/games/consoles-de-video-game/ps4-1552147260',
        text: 'Ps4\nParcele sem juros\nR$ 700\nem até 3x de R$ 233,33 sem juros\n\nSão Paulo, Brás\n\nHoje, 19:21\n\nSlide 1\nAdicionar aos favoritos',
        image: null
      },
      'olx',
      'ps4'
    )
    expect(listing?.title).toBe('Ps4')
  })

  it('does not pick a short badge like Pix as the title', () => {
    const listing = parseCard(
      { url: 'https://shopee.com.br/x-i.1.2', text: 'Pix\nConsole Playstation Sony Slim\nR$ 1.999', image: null },
      'shopee',
      'ps4'
    )
    expect(listing?.title).toBe('Console Playstation Sony Slim')
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
