import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Opportunity, Purchase, SavedSearch } from '../../shared/types'
import { JsonFile } from '../store/jsonFile'
import { OpportunitiesRepo, parsePriceCache, PriceCache, PurchasesRepo, SearchesRepo, type PriceCacheData } from './repositories'
import { parseOpportunities, parsePurchases, parseSearches } from './validation'

let dir = ''

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'radar-repo-'))
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

const searchesRepo = (): SearchesRepo => new SearchesRepo(new JsonFile<SavedSearch[]>(join(dir, 's.json'), parseSearches, () => []))
const purchasesRepo = (): PurchasesRepo => new PurchasesRepo(new JsonFile<Purchase[]>(join(dir, 'p.json'), parsePurchases, () => []))
const oppsRepo = (): OpportunitiesRepo => new OpportunitiesRepo(new JsonFile<Opportunity[]>(join(dir, 'o.json'), parseOpportunities, () => []))

const opportunity = (id: string, status: Opportunity['status'] = 'nova', foundAt = '2026-11-10T10:00:00.000Z'): Opportunity => ({
  id,
  searchId: 's1',
  status,
  foundAt,
  listing: { id, platformId: 'olx', url: `https://olx.com.br/${id}`, title: 'iPhone', price: 100, image: null, location: null, text: '' },
  analysis: {
    productName: 'iPhone',
    productQuery: 'iphone',
    condition: 'usado',
    marketUsedPrice: null,
    marketNewPrice: null,
    comparables: [],
    channels: [],
    bestChannel: null,
    bestProfit: null,
    marginPct: null,
    score: 5,
    flags: [],
    aiUsed: false,
    analyzedAt: foundAt
  }
})

describe('SearchesRepo', () => {
  const input = { query: 'ps5', minPrice: null, maxPrice: 3000, platforms: ['olx'] as const, active: true }

  it('creates, updates, marks run and removes searches', () => {
    const repo = searchesRepo()
    const [created] = repo.create({ ...input, platforms: [...input.platforms] })
    expect(created?.query).toBe('ps5')
    const id = created?.id ?? ''

    expect(repo.update(id, { ...input, platforms: ['enjoei'], query: 'ps5 slim' })[0]?.query).toBe('ps5 slim')
    repo.markRun(id, '2026-11-10T12:00:00.000Z')
    expect(repo.list()[0]?.lastRunAt).toBe('2026-11-10T12:00:00.000Z')
    expect(repo.remove(id)).toEqual([])
  })

  it('fails to update an unknown search', () => {
    expect(() => searchesRepo().update('nope', { ...input, platforms: ['olx'] })).toThrow(/não encontrada/)
  })
})

describe('OpportunitiesRepo', () => {
  it('adds only new ids and tracks known ids', () => {
    const repo = oppsRepo()
    repo.addMany([opportunity('a'), opportunity('b')])
    repo.addMany([opportunity('a'), opportunity('c')])
    expect(repo.list().map((o) => o.id)).toEqual(['a', 'b', 'c'])
    expect(repo.knownIds().has('c')).toBe(true)
  })

  it('updates status and clears discarded ones', () => {
    const repo = oppsRepo()
    repo.addMany([opportunity('a'), opportunity('b')])
    repo.setStatus('a', 'descartada')
    expect(repo.clearDiscarded().map((o) => o.id)).toEqual(['b'])
  })
})

describe('PurchasesRepo', () => {
  it('adds a purchase and registers the sale', () => {
    const repo = purchasesRepo()
    const [p] = repo.add({ title: 'iPhone 13', platformId: 'facebook', paidPrice: 1500, listingUrl: null, opportunityId: null, notes: '' })
    const sold = repo.sell(p?.id ?? '', { soldPrice: 1900, soldChannel: 'olx' })
    expect(sold[0]).toMatchObject({ soldPrice: 1900, soldChannel: 'olx' })
    expect(sold[0]?.soldAt).not.toBeNull()
    expect(repo.remove(p?.id ?? '')).toEqual([])
  })
})

describe('PriceCache', () => {
  const cache = (): PriceCache => new PriceCache(new JsonFile<PriceCacheData>(join(dir, 'c.json'), parsePriceCache, () => ({})))
  const items = [{ platformId: 'buscape' as const, title: 'PS5', price: 3500, url: 'https://buscape.com.br/x', condition: 'novo' as const }]

  it('returns fresh entries and ignores expired ones', () => {
    const c = cache()
    c.set('ps5', items)
    expect(c.get('ps5', 60_000)).toEqual(items)
    expect(c.get('ps5', -1)).toBeNull()
    expect(c.get('outro', 60_000)).toBeNull()
  })

  it('drops malformed cache entries', () => {
    expect(parsePriceCache({ ok: { fetchedAt: '2026-11-10T00:00:00.000Z', items: [] }, bad: { foo: 1 } })).toEqual({
      ok: { fetchedAt: '2026-11-10T00:00:00.000Z', items: [] }
    })
  })
})
