/** Repositórios em arquivos JSON locais (buscas, oportunidades, compras e cache de preços). */
import { randomUUID } from 'node:crypto'
import type {
  Comparable,
  Opportunity,
  OpportunityStatus,
  Purchase,
  PurchaseInput,
  SaleInput,
  SavedSearch,
  SearchInput
} from '../../shared/types'
import type { JsonFile } from '../store/jsonFile'

const MAX_OPPORTUNITIES = 1500
const PRICE_CACHE_MAX_ENTRIES = 300

function requireExisting<T extends { id: string }>(items: readonly T[], id: string, label: string): T {
  const found = items.find((i) => i.id === id)
  if (!found) throw new Error(`${label} não encontrada.`)
  return found
}

export class SearchesRepo {
  constructor(private readonly file: JsonFile<SavedSearch[]>) {}

  list(): SavedSearch[] {
    return this.file.read()
  }

  create(input: SearchInput): SavedSearch[] {
    const search: SavedSearch = { ...input, id: randomUUID(), createdAt: new Date().toISOString(), lastRunAt: null }
    return this.file.update((all) => [...all, search])
  }

  update(id: string, input: SearchInput): SavedSearch[] {
    return this.file.update((all) => {
      requireExisting(all, id, 'Busca')
      return all.map((s) => (s.id === id ? { ...s, ...input } : s))
    })
  }

  remove(id: string): SavedSearch[] {
    return this.file.update((all) => all.filter((s) => s.id !== id))
  }

  markRun(id: string, at: string): void {
    this.file.update((all) => all.map((s) => (s.id === id ? { ...s, lastRunAt: at } : s)))
  }
}

/** Mantém o arquivo enxuto: descarta primeiro as descartadas mais antigas, depois as mais antigas. */
function trimOpportunities(all: readonly Opportunity[]): Opportunity[] {
  if (all.length <= MAX_OPPORTUNITIES) return [...all]
  const byAge = [...all].sort((a, b) => a.foundAt.localeCompare(b.foundAt))
  const excess = all.length - MAX_OPPORTUNITIES
  const discarded = byAge.filter((o) => o.status === 'descartada').slice(0, excess)
  const removeIds = new Set(discarded.map((o) => o.id))
  const remaining = byAge.filter((o) => !removeIds.has(o.id))
  return remaining.slice(Math.max(0, remaining.length - MAX_OPPORTUNITIES))
}

export class OpportunitiesRepo {
  constructor(private readonly file: JsonFile<Opportunity[]>) {}

  list(): Opportunity[] {
    return this.file.read()
  }

  knownIds(): ReadonlySet<string> {
    return new Set(this.file.read().map((o) => o.id))
  }

  addMany(items: readonly Opportunity[]): Opportunity[] {
    if (items.length === 0) return this.list()
    return this.file.update((all) => {
      const known = new Set(all.map((o) => o.id))
      return trimOpportunities([...all, ...items.filter((o) => !known.has(o.id))])
    })
  }

  setStatus(id: string, status: OpportunityStatus): Opportunity[] {
    return this.file.update((all) => {
      requireExisting(all, id, 'Oportunidade')
      return all.map((o) => (o.id === id ? { ...o, status } : o))
    })
  }

  clearDiscarded(): Opportunity[] {
    return this.file.update((all) => all.filter((o) => o.status !== 'descartada'))
  }
}

export class PurchasesRepo {
  constructor(private readonly file: JsonFile<Purchase[]>) {}

  list(): Purchase[] {
    return this.file.read()
  }

  add(input: PurchaseInput): Purchase[] {
    const purchase: Purchase = {
      ...input,
      id: randomUUID(),
      boughtAt: new Date().toISOString(),
      soldPrice: null,
      soldAt: null,
      soldChannel: null
    }
    return this.file.update((all) => [purchase, ...all])
  }

  sell(id: string, sale: SaleInput): Purchase[] {
    return this.file.update((all) => {
      requireExisting(all, id, 'Compra')
      return all.map((p) => (p.id === id ? { ...p, ...sale, soldAt: new Date().toISOString() } : p))
    })
  }

  remove(id: string): Purchase[] {
    return this.file.update((all) => all.filter((p) => p.id !== id))
  }
}

export interface PriceCacheEntry {
  readonly fetchedAt: string
  readonly items: readonly Comparable[]
}

export type PriceCacheData = Readonly<Record<string, PriceCacheEntry>>

export class PriceCache {
  constructor(private readonly file: JsonFile<PriceCacheData>) {}

  get(key: string, maxAgeMs: number): readonly Comparable[] | null {
    const entry = this.file.read()[key]
    if (!entry) return null
    return Date.now() - Date.parse(entry.fetchedAt) <= maxAgeMs ? entry.items : null
  }

  set(key: string, items: readonly Comparable[]): void {
    this.file.update((all) => {
      const entries = Object.entries({ ...all, [key]: { fetchedAt: new Date().toISOString(), items } })
      const newest = entries.sort(([, a], [, b]) => b.fetchedAt.localeCompare(a.fetchedAt)).slice(0, PRICE_CACHE_MAX_ENTRIES)
      return Object.fromEntries(newest)
    })
  }
}

/** Validação mínima do cache (dados gerados pelo próprio app). */
export function parsePriceCache(raw: unknown): PriceCacheData {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const valid = Object.entries(raw).filter(
    ([, v]) => typeof v === 'object' && v !== null && typeof (v as PriceCacheEntry).fetchedAt === 'string' && Array.isArray((v as PriceCacheEntry).items)
  )
  return Object.fromEntries(valid) as PriceCacheData
}
