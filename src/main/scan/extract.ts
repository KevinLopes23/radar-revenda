/** Conversão do texto bruto de um card de anúncio em `Listing` (funções puras). */
import type { PlatformId } from '../../shared/platforms'
import type { Listing } from '../../shared/types'
import { normalizeText, tokenize } from '../analysis/text'

export interface RawCard {
  readonly url: string
  readonly text: string
  readonly image: string | null
}

const PRICE_PATTERN = /R\$\s*(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/
const LOCATION_PATTERN = /^[A-ZÀ-Úa-zà-ú][^,\n]{1,40},\s?[A-Z]{2}$/
const NOISE_LINE =
  /^(\d+([.,]\d+)?%?|\d+([.,]\d)?\s*\(\d+\)|oferta.*|via .*|compare.*|frete.*|em ate.*|ate \d+x.*|\d+x .*|parcel.*|patrocinado|anuncio|destaque|novo|usado|retire.*|entrega.*|full|mais vendido.*|cupom.*|desconto.*|loja oficial.*|.*% .*)$/
const ALL_PRICES_PATTERN = new RegExp(PRICE_PATTERN.source, 'g')
/** Linhas com parcela, frete ou cashback não trazem o preço do produto. */
const NOT_PRODUCT_PRICE_LINE = /(\d+\s?x\b|\bx de\b|parcela|frete|cashback|de volta|economize|acima de)/i
const MAX_TEXT_LENGTH = 1000
const MAX_TITLE_LENGTH = 300
const MIN_TITLE_LENGTH = 4
const FACEBOOK_ITEM = /facebook\.com\/marketplace\/item\/(\d+)/

export function parseBrlPrice(text: string): number | null {
  const match = PRICE_PATTERN.exec(text)
  if (!match) return null
  const integer = Number((match[1] ?? '').replace(/\./g, ''))
  const cents = match[2] ? Number(match[2].padEnd(2, '0')) / 100 : 0
  const value = integer + cents
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) / 100 : null
}

/**
 * Preço atual do card: o menor valor fora de linhas de parcela/frete.
 * (O preço "de" riscado é sempre maior que o preço atual.)
 */
export function currentPrice(text: string): number | null {
  const prices = text
    .split('\n')
    .filter((line) => !NOT_PRODUCT_PRICE_LINE.test(line))
    .flatMap((line) => [...line.matchAll(ALL_PRICES_PATTERN)].map((m) => parseBrlPrice(m[0])))
    .filter((p): p is number => p !== null)
  return prices.length > 0 ? Math.min(...prices) : null
}

export function canonicalUrl(url: string): string {
  const fb = FACEBOOK_ITEM.exec(url)
  if (fb) return `https://www.facebook.com/marketplace/item/${fb[1]}/`
  try {
    const parsed = new URL(url)
    return `${parsed.origin}${parsed.pathname}`
  } catch {
    return url
  }
}

function titleFromSlug(url: string): string | null {
  try {
    const last = new URL(url).pathname.split('/').filter(Boolean).pop() ?? ''
    const slug = last.replace(/-\d+$/, '').replace(/[-_]+/g, ' ').trim()
    return slug.length >= MIN_TITLE_LENGTH ? slug : null
  } catch {
    return null
  }
}

/** Linha curta (ex.: "Ps4") só vale como título se tiver palavra da busca; senão costuma ser selo ("Pix", "Top"). */
const sharesQueryToken = (line: string, query: string): boolean => {
  const queryTokens = new Set(tokenize(query))
  return tokenize(line).some((t) => queryTokens.has(t))
}

function pickTitle(lines: readonly string[], query: string): string | null {
  const queryTokens = new Set(tokenize(query))
  // Sem palavra da busca no texto, vence a linha mais acima do card (onde fica o título);
  // a mais longa costumava ser o bairro/cidade na OLX.
  const scored = lines.map((line, index) => {
    const overlap = tokenize(line).filter((t) => queryTokens.has(t)).length
    return { line, score: overlap * 10 - index / lines.length }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored[0]?.line ?? null
}

/** Extrai preço, título e local de um card; `null` se não houver preço. */
export function parseCard(raw: RawCard, platformId: PlatformId, query: string): Listing | null {
  const price = currentPrice(raw.text)
  if (price === null) return null

  const lines = raw.text.split('\n').map((l) => l.trim()).filter(Boolean)
  const location = lines.find((l) => LOCATION_PATTERN.test(l)) ?? null
  const candidates = lines.filter(
    (l) =>
      !l.includes('R$') &&
      l !== location &&
      (l.length >= MIN_TITLE_LENGTH || sharesQueryToken(l, query)) &&
      !NOISE_LINE.test(normalizeText(l))
  )
  const title = (pickTitle(candidates, query) ?? titleFromSlug(raw.url) ?? 'Anúncio sem título').slice(0, MAX_TITLE_LENGTH)
  const url = canonicalUrl(raw.url)

  return {
    id: `${platformId}:${url}`,
    platformId,
    url,
    title,
    price,
    image: raw.image,
    location,
    text: raw.text.slice(0, MAX_TEXT_LENGTH)
  }
}
