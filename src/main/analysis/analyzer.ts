/** Análise completa de um anúncio: produto, preço de mercado, lucro por canal, riscos e nota. */
import { getPlatform, PLATFORMS } from '../../shared/platforms'
import type { Analysis, Comparable, Flag, Listing, ListingCondition, Settings } from '../../shared/types'
import { estimateResalePrice, marketPrices } from './pricing'
import { computeChannels, scoreOpportunity } from './profit'
import { detectFlags } from './risks'
import { detectCondition, heuristicProductQuery, isAccessoryTitle, isComparable, tokenize } from './text'

export interface ProductIdentification {
  readonly productName: string
  readonly productQuery: string
  readonly condition: ListingCondition
  readonly isAccessory: boolean
  readonly risks: readonly string[]
}

interface AnalyzeInput {
  readonly listing: Listing
  /** Todos os anúncios encontrados na mesma busca (servem de comparação). */
  readonly pool: readonly Listing[]
  /** Preços de produto novo (ex.: Buscapé). */
  readonly newReferences: readonly Comparable[]
  readonly identification: ProductIdentification | null
  readonly settings: Settings
}

const NEW_ITEM_RESALE_RATIO = 0.85
const MAX_COMPARABLES_SHOWN = 12
const RESALE_CHANNELS = PLATFORMS.filter((p) => p.roles.revenda).map((p) => p.id)

/** Estado do anúncio pelo texto; sem pista, usa o padrão da plataforma (ex.: Mercado Livre = novo). */
function conditionOf(listing: Listing): ListingCondition {
  const detected = detectCondition(`${listing.title} ${listing.text}`)
  return detected === 'desconhecido' ? getPlatform(listing.platformId).defaultCondition : detected
}

function toComparable(listing: Listing): Comparable {
  return {
    platformId: listing.platformId,
    title: listing.title,
    price: listing.price,
    url: listing.url,
    condition: conditionOf(listing)
  }
}

function findComparables(input: AnalyzeInput, productQuery: string): Comparable[] {
  const fromPool = input.pool
    .filter((other) => other.id !== input.listing.id && isComparable(productQuery, other.title))
    .map(toComparable)
  const fromNew = input.newReferences.filter((ref) => isComparable(productQuery, ref.title))
  return [...fromPool, ...fromNew]
}

function resolveCondition(input: AnalyzeInput): ListingCondition {
  const fromAi = input.identification?.condition
  if (fromAi && fromAi !== 'desconhecido') return fromAi
  return conditionOf(input.listing)
}

function buildFlags(input: AnalyzeInput, marketPrice: number | null, comparablesCount: number): Flag[] {
  const { listing, identification } = input
  const flags = detectFlags({ text: `${listing.title}\n${listing.text}`, price: listing.price, marketPrice, comparablesCount })
  const aiFlags: Flag[] = (identification?.risks ?? []).map((text) => ({ level: 'medio', text }))
  const isAccessory = identification?.isAccessory ?? isAccessoryTitle(listing.title)
  const accessoryFlag: Flag[] = isAccessory ? [{ level: 'info', text: 'Parece acessório ou peça, não o produto completo.' }] : []
  const seen = new Set<string>()
  return [...flags, ...aiFlags, ...accessoryFlag].filter((f) => !seen.has(f.text) && Boolean(seen.add(f.text)))
}

const LINK_PATTERN = /https?:\/\/|www\.|\.com\b|\.br\b/i

/**
 * A resposta da IA é tratada como não confiável (o texto do anúncio pode tentar manipulá-la):
 * se a busca sugerida não tem nada a ver com o título, a IA é ignorada; riscos com links são descartados.
 */
export function trustedIdentification(identification: ProductIdentification | null, title: string): ProductIdentification | null {
  if (!identification) return null
  const titleTokens = new Set(tokenize(title))
  const overlaps = tokenize(identification.productQuery).some((t) => titleTokens.has(t))
  if (!overlaps) return null
  return { ...identification, risks: identification.risks.filter((r) => !LINK_PATTERN.test(r)).slice(0, 4) }
}

export function analyzeListing(rawInput: AnalyzeInput): Analysis {
  const input = { ...rawInput, identification: trustedIdentification(rawInput.identification, rawInput.listing.title) }
  const { listing, identification, settings } = input
  const productQuery = identification?.productQuery || heuristicProductQuery(listing.title)
  const condition = resolveCondition(input)
  const comparables = findComparables(input, productQuery)
  const market = marketPrices(comparables)

  const baseResale = estimateResalePrice(market)
  const resale =
    condition === 'novo' && market.newMedian !== null ? market.newMedian * NEW_ITEM_RESALE_RATIO : baseResale

  const channels =
    resale === null
      ? []
      : computeChannels({
          marketPrice: resale,
          quickSaleDiscountPct: settings.quickSaleDiscountPct,
          cost: listing.price,
          extraCost: settings.extraCostPerPurchase,
          fees: settings.fees,
          channels: RESALE_CHANNELS
        })

  const best = channels[0] ?? null
  const flags = buildFlags(input, resale, comparables.length)
  const bestProfit = best?.profit ?? null

  return {
    productName: identification?.productName || listing.title,
    productQuery,
    condition,
    marketUsedPrice: market.usedMedian,
    marketNewPrice: market.newMedian,
    comparables: [...comparables].sort((a, b) => a.price - b.price).slice(0, MAX_COMPARABLES_SHOWN),
    channels,
    bestChannel: best?.platformId ?? null,
    bestProfit,
    marginPct: bestProfit === null ? null : Math.round((bestProfit / listing.price) * 1000) / 10,
    score: scoreOpportunity({ profit: bestProfit, cost: listing.price, comparablesCount: comparables.length, flags }),
    flags,
    aiUsed: identification !== null,
    analyzedAt: new Date().toISOString()
  }
}
