import { describe, expect, it } from 'vitest'
import type { Comparable } from '../../shared/types'
import { estimateResalePrice, marketPrices, median, removeOutliers } from './pricing'

const comp = (price: number, condition: Comparable['condition'] = 'usado'): Comparable => ({
  platformId: 'olx',
  title: 'iPhone 13 128GB',
  price,
  url: `https://example.com/${price}`,
  condition
})

describe('median', () => {
  it('returns null for empty input', () => {
    expect(median([])).toBeNull()
  })

  it('returns the middle value for odd length', () => {
    expect(median([3, 1, 2])).toBe(2)
  })

  it('returns the average of the two middle values for even length', () => {
    expect(median([1, 2, 3, 4])).toBe(2.5)
  })
})

describe('removeOutliers', () => {
  it('keeps small samples untouched', () => {
    expect(removeOutliers([100, 5000, 2000])).toEqual([100, 5000, 2000])
  })

  it('drops values far outside the interquartile range', () => {
    expect(removeOutliers([2000, 2100, 2200, 2300, 2150, 50, 9000])).toEqual([2000, 2100, 2200, 2300, 2150])
  })
})

describe('marketPrices', () => {
  it('splits used and new prices and counts samples', () => {
    const result = marketPrices([comp(2000), comp(2200), comp(2400), comp(3500, 'novo'), comp(3700, 'novo')])
    expect(result).toEqual({ usedMedian: 2200, newMedian: 3600, usedCount: 3, newCount: 2 })
  })

  it('treats unknown condition as used', () => {
    expect(marketPrices([comp(1000, 'desconhecido')]).usedMedian).toBe(1000)
  })

  it('returns nulls when there are no comparables', () => {
    expect(marketPrices([])).toEqual({ usedMedian: null, newMedian: null, usedCount: 0, newCount: 0 })
  })
})

describe('estimateResalePrice', () => {
  it('prefers the used market price', () => {
    expect(estimateResalePrice({ usedMedian: 2000, newMedian: 3500, usedCount: 4, newCount: 2 })).toBe(2000)
  })

  it('falls back to 70% of the new price', () => {
    expect(estimateResalePrice({ usedMedian: null, newMedian: 1000, usedCount: 0, newCount: 3 })).toBe(700)
  })

  it('returns null without any reference', () => {
    expect(estimateResalePrice({ usedMedian: null, newMedian: null, usedCount: 0, newCount: 0 })).toBeNull()
  })
})
