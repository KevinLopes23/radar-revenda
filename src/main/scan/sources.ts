/** URLs de busca, padrões de link de anúncio e detecção de bloqueio por plataforma. */
import type { PlatformId } from '../../shared/platforms'
import { normalizeText } from '../analysis/text'

export interface SearchQuery {
  readonly query: string
  readonly minPrice: number | null
  readonly maxPrice: number | null
}

const SAFE_REGION_PATH = /^[a-z0-9-]+(\/[a-z0-9-]+)*$/
const DEFAULT_OLX_REGION = 'brasil'

function withParams(base: string, params: ReadonlyArray<[string, number | string | null]>): string {
  const search = new URLSearchParams()
  params.forEach(([key, value]) => {
    if (value !== null && value !== '') search.append(key, String(value))
  })
  return `${base}?${search.toString()}`
}

export function buildSearchUrl(platformId: PlatformId, q: SearchQuery, olxRegionPath: string): string {
  const { query, minPrice, maxPrice } = q
  switch (platformId) {
    case 'facebook':
      return withParams('https://www.facebook.com/marketplace/search/', [
        ['query', query],
        ['minPrice', minPrice],
        ['maxPrice', maxPrice],
        ['sortBy', 'creation_time_descend']
      ])
    case 'olx': {
      const region = SAFE_REGION_PATH.test(olxRegionPath) ? olxRegionPath : DEFAULT_OLX_REGION
      return withParams(`https://www.olx.com.br/${region}`, [
        ['q', query],
        ['sf', 1],
        ['ps', minPrice],
        ['pe', maxPrice]
      ])
    }
    case 'mercadolivre': {
      const slug = normalizeText(query).replace(/ /g, '-')
      const range = maxPrice !== null ? `_PriceRange_${minPrice ?? 0}-${maxPrice}` : ''
      return `https://lista.mercadolivre.com.br/${slug}${range}`
    }
    case 'enjoei':
      return withParams('https://www.enjoei.com.br/s', [
        ['q', query],
        ['pg', minPrice],
        ['pl', maxPrice]
      ])
    case 'shopee':
      return withParams('https://shopee.com.br/search', [
        ['keyword', query],
        ['minPrice', minPrice],
        ['maxPrice', maxPrice]
      ])
    case 'buscape':
      return withParams('https://www.buscape.com.br/search', [['q', query]])
  }
}

const ITEM_URL: Readonly<Record<PlatformId, RegExp>> = {
  facebook: /facebook\.com\/marketplace\/item\/\d+/,
  olx: /olx\.com\.br\/.+-\d{6,}(?:[?#/]|$)/,
  mercadolivre: /mercadoli[vb]re\.com\.br\/.*MLB-?\d+/i,
  enjoei: /enjoei\.com\.br\/p\/[^/?#]+-\d+/,
  shopee: /shopee\.com\.br\/.+-i\.\d+\.\d+/,
  buscape: /buscape\.com\.br\/(?!search)[a-z0-9-]+\/[a-z0-9-]+/
}

export function isItemUrl(platformId: PlatformId, url: string): boolean {
  return ITEM_URL[platformId].test(url)
}

/** Expressões (como string) para o filtro de links executado dentro da página. */
export function itemUrlPattern(platformId: PlatformId): string {
  return ITEM_URL[platformId].source
}

const BLOCK_TITLE = /attention required|just a moment|request could not be satisfied|access denied|captcha|são você|verifique/i
const LOGIN_URL = /\/(checkpoint|login|account-verification|two_step_verification)(\/|\?|$)|\/verify\/|captcha|challenge/i

/** Motivo do bloqueio (proteção anti-robô ou login), ou `null` se a página carregou normalmente. */
export function detectBlock(url: string, title: string): string | null {
  if (BLOCK_TITLE.test(title)) {
    return 'O site pediu uma verificação anti-robô. Abra a plataforma em Configurações, resolva a verificação e tente de novo.'
  }
  if (LOGIN_URL.test(url)) {
    return 'O site pediu login ou verificação. Conecte (ou reconecte) a conta em Configurações.'
  }
  return null
}
