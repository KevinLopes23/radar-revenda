/** Estatística de preços de mercado (funções puras). */
import type { Comparable, PriceRange } from '../../shared/types'

const MIN_SAMPLES_FOR_OUTLIERS = 5
const MIN_SAMPLES_FOR_RANGE = 2
const IQR_FACTOR = 1.5
const USED_FROM_NEW_RATIO = 0.7
/** Um "novo" que custa mais que isso vezes o usado quase sempre é outro produto ou um preço fora da realidade. */
const MAX_NEW_TO_USED_RATIO = 2.5

export interface MarketPrices {
  readonly usedMedian: number | null
  readonly newMedian: number | null
  readonly usedCount: number
  readonly newCount: number
  readonly usedRange: PriceRange | null
}

const round2 = (value: number): number => Math.round(value * 100) / 100

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  const value = sorted.length % 2 === 0 ? ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2 : (sorted[mid] ?? 0)
  return round2(value)
}

function quantile(sorted: readonly number[], q: number): number {
  const pos = (sorted.length - 1) * q
  const base = Math.floor(pos)
  const next = sorted[base + 1] ?? sorted[base] ?? 0
  const current = sorted[base] ?? 0
  return current + (next - current) * (pos - base)
}

/** Remove preços muito fora da curva (regra do intervalo interquartil). */
export function removeOutliers(values: readonly number[]): number[] {
  if (values.length < MIN_SAMPLES_FOR_OUTLIERS) return [...values]
  const sorted = [...values].sort((a, b) => a - b)
  const q1 = quantile(sorted, 0.25)
  const q3 = quantile(sorted, 0.75)
  const iqr = q3 - q1
  const low = q1 - IQR_FACTOR * iqr
  const high = q3 + IQR_FACTOR * iqr
  return values.filter((v) => v >= low && v <= high)
}

/** Faixa típica: metade dos anúncios custa entre \`low\` e \`high\`. */
export function priceRange(values: readonly number[]): PriceRange | null {
  if (values.length < MIN_SAMPLES_FOR_RANGE) return null
  const sorted = [...values].sort((a, b) => a - b)
  return { low: round2(quantile(sorted, 0.25)), high: round2(quantile(sorted, 0.75)) }
}

export function marketPrices(comparables: readonly Comparable[]): MarketPrices {
  const used = removeOutliers(comparables.filter((c) => c.condition !== 'novo').map((c) => c.price))
  const usedMedian = median(used)
  const newPrices = comparables.filter((c) => c.condition === 'novo').map((c) => c.price)
  const plausibleNew = usedMedian === null ? newPrices : newPrices.filter((p) => p <= usedMedian * MAX_NEW_TO_USED_RATIO)
  const fresh = removeOutliers(plausibleNew)
  return {
    usedMedian,
    newMedian: median(fresh),
    usedCount: used.length,
    newCount: fresh.length,
    usedRange: priceRange(used)
  }
}

/** Preço de revenda de referência: mediana dos usados; sem usados, 70% do preço de novo. */
export function estimateResalePrice(market: MarketPrices): number | null {
  if (market.usedMedian !== null) return market.usedMedian
  if (market.newMedian !== null) return round2(market.newMedian * USED_FROM_NEW_RATIO)
  return null
}
