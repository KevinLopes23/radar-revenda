/** Orquestra a varredura: busca nas plataformas, compara preços, analisa e salva oportunidades. */
import type { AccountState } from '../../shared/ipc'
import { getPlatform, type PlatformId } from '../../shared/platforms'
import type { Comparable, Listing, Opportunity, SavedSearch, ScanLogLevel, ScanStatus, Settings } from '../../shared/types'
import type { BrowserManager } from '../accounts/browser'
import { fetchImage, GeminiClient, isFatalGeminiError } from '../ai/gemini'
import { analyzeListing, type ProductIdentification } from '../analysis/analyzer'
import { detectCondition, normalizeText } from '../analysis/text'
import type { OpportunitiesRepo, PriceCache, SearchesRepo } from '../data/repositories'
import type { SettingsService } from '../settings/settingsService'
import { BlockedError, pause, readDescription, scrapeSearchPage } from './pageScraper'
import { buildSearchUrl } from './sources'

const MAX_LOG_ENTRIES = 200
const PRICE_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000
const AI_CALL_GAP_MS = 4_000
const INTERVAL_JITTER = 0.1

export interface ScanDeps {
  readonly browser: BrowserManager
  readonly accounts: () => readonly AccountState[]
  readonly searches: SearchesRepo
  readonly opportunities: OpportunitiesRepo
  readonly priceCache: PriceCache
  readonly settings: SettingsService
  readonly onStatus: (status: ScanStatus) => void
  readonly onNewOpportunities: (items: readonly Opportunity[]) => void
}

const IDLE: ScanStatus = { running: false, message: 'Parado', startedAt: null, finishedAt: null, nextRunAt: null, log: [] }

class CancelledError extends Error {}

export class ScanService {
  private status: ScanStatus = IDLE
  private cancelRequested = false
  private timer: NodeJS.Timeout | null = null
  private disposed = false

  constructor(private readonly deps: ScanDeps) {}

  getStatus(): ScanStatus {
    return this.status
  }

  /** Inicia uma rodada (todas as buscas ativas ou só uma). Retorna na hora; o progresso vem por eventos. */
  start(searchId: string | null): ScanStatus {
    if (this.status.running || this.disposed) return this.status
    this.cancelRequested = false
    this.update({ running: true, message: 'Iniciando varredura...', startedAt: new Date().toISOString(), finishedAt: null, log: [] })
    void this.runRound(searchId)
    return this.status
  }

  stop(): ScanStatus {
    if (this.status.running) {
      this.cancelRequested = true
      this.update({ message: 'Parando após a etapa atual...' })
    }
    return this.status
  }

  /** Reagenda a varredura automática conforme as configurações. */
  reschedule(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    if (this.disposed) return
    const { autoEnabled, intervalMinutes } = this.deps.settings.get().scan
    if (!autoEnabled) {
      this.update({ nextRunAt: null })
      return
    }
    const jitter = 1 + (Math.random() * 2 - 1) * INTERVAL_JITTER
    const delayMs = Math.round(intervalMinutes * 60_000 * jitter)
    this.timer = setTimeout(() => {
      this.start(null)
    }, delayMs)
    this.update({ nextRunAt: new Date(Date.now() + delayMs).toISOString() })
  }

  dispose(): void {
    this.disposed = true
    this.cancelRequested = true
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
  }

  private async runRound(searchId: string | null): Promise<void> {
    const searches = this.deps.searches.list().filter((s) => (searchId ? s.id === searchId : s.active))
    let found = 0
    try {
      if (searches.length === 0) this.log('aviso', 'Nenhuma busca ativa. Cadastre uma busca na aba Varredura.')
      for (const search of searches) {
        found += await this.runSearch(search)
      }
      this.finish(`Concluído: ${found} oportunidade(s) nova(s).`)
    } catch (error) {
      if (error instanceof CancelledError) this.finish('Varredura interrompida.')
      else this.finish(`Erro: ${error instanceof Error ? error.message : String(error)}`, 'erro')
    } finally {
      // Fecha o Chrome só se ninguém abriu a janela para fazer login durante a rodada.
      await this.deps.browser.releaseAfterScan().catch(() => undefined)
      this.reschedule()
    }
  }

  private async runSearch(search: SavedSearch): Promise<number> {
    const settings = this.deps.settings.get()
    this.log('info', `Busca "${search.query}"`)
    const pool: Listing[] = []
    for (const platformId of this.eligiblePlatforms(search)) {
      this.checkCancel()
      pool.push(...(await this.scrapePlatform(platformId, search, settings)))
    }
    const inRange = pool.filter(
      (l) => (search.minPrice === null || l.price >= search.minPrice) && (search.maxPrice === null || l.price <= search.maxPrice)
    )
    const references = await this.newPriceReferences(search, settings)
    const known = this.deps.opportunities.knownIds()
    const fresh = inRange.filter((l) => !known.has(l.id)).slice(0, settings.scan.maxAnalysesPerRun)
    const created: Opportunity[] = []
    try {
      await this.analyzeAll(fresh, pool, references, search, settings, created)
    } finally {
      // Mesmo se a rodada for interrompida, o que já foi analisado é salvo.
      this.deps.opportunities.addMany(created)
      this.deps.searches.markRun(search.id, new Date().toISOString())
      if (created.length > 0) this.deps.onNewOpportunities(created)
    }
    this.log('ok', `"${search.query}": ${pool.length} anúncio(s) lidos, ${created.length} novo(s) analisado(s).`)
    return created.length
  }

  private eligiblePlatforms(search: SavedSearch): PlatformId[] {
    const accounts = this.deps.accounts()
    return search.platforms.filter((id) => {
      const platform = getPlatform(id)
      const connected = accounts.find((a) => a.platformId === id)?.status === 'conectado'
      if (platform.loginRequired && !connected) {
        this.log('aviso', `${platform.name}: conecte a conta em Configurações para incluir na varredura.`)
        return false
      }
      return true
    })
  }

  private async scrapePlatform(platformId: PlatformId, search: SavedSearch, settings: Settings): Promise<Listing[]> {
    const platform = getPlatform(platformId)
    this.update({ message: `Lendo ${platform.name}: "${search.query}"` })
    try {
      const url = buildSearchUrl(platformId, search, settings.olxRegionPath)
      const listings = await this.deps.browser.withPage((page) =>
        scrapeSearchPage(page, { platformId, url, query: search.query, max: settings.scan.maxPerPlatform })
      )
      this.log(listings.length > 0 ? 'info' : 'aviso', `${platform.name}: ${listings.length} anúncio(s).`)
      await pause(3_000, 7_000)
      return listings
    } catch (error) {
      const level: ScanLogLevel = error instanceof BlockedError ? 'aviso' : 'erro'
      this.log(level, `${platform.name}: ${error instanceof Error ? error.message : String(error)}`)
      return []
    }
  }

  /** Preços de produto novo no Buscapé (com cache de 24 h por busca). */
  private async newPriceReferences(search: SavedSearch, settings: Settings): Promise<readonly Comparable[]> {
    const key = `buscape:${normalizeText(search.query)}`
    const cached = this.deps.priceCache.get(key, PRICE_CACHE_MAX_AGE_MS)
    if (cached) return cached
    const listings = await this.scrapePlatform('buscape', search, settings)
    const items: Comparable[] = listings.map((l) => ({
      platformId: 'buscape',
      title: l.title,
      price: l.price,
      url: l.url,
      condition: detectCondition(l.title) === 'usado' ? 'usado' : 'novo'
    }))
    if (items.length > 0) this.deps.priceCache.set(key, items)
    return items
  }

  private async analyzeAll(
    fresh: readonly Listing[],
    pool: readonly Listing[],
    references: readonly Comparable[],
    search: SavedSearch,
    settings: Settings,
    created: Opportunity[]
  ): Promise<void> {
    let gemini = this.createGemini(settings)
    const blockedPlatforms = new Set<PlatformId>()
    for (const [index, rawListing] of fresh.entries()) {
      this.checkCancel()
      this.update({ message: `Lendo a descrição ${index + 1}/${fresh.length}: ${rawListing.title}` })
      const listing = await this.withDescription(rawListing, blockedPlatforms)
      this.checkCancel()
      this.update({ message: `Analisando ${index + 1}/${fresh.length}: ${listing.title}` })
      const { identification, fatal } = gemini ? await this.identify(gemini, listing) : { identification: null, fatal: false }
      // Erro definitivo (chave, limite, modelo): segue o resto da rodada sem a IA. Sobrecarga passageira: tenta no próximo.
      if (fatal) gemini = null
      const analysis = analyzeListing({ listing, pool, newReferences: references, identification, settings })
      created.push({ id: listing.id, searchId: search.id, listing, analysis, status: 'nova', foundAt: new Date().toISOString() })
    }
  }

  /**
   * Abre o anúncio para ler a descrição completa (é ali que o vendedor costuma avisar defeitos).
   * Se a plataforma bloquear, para de abrir anúncios dela nesta rodada (insistir arrisca a conta).
   */
  private async withDescription(listing: Listing, blocked: Set<PlatformId>): Promise<Listing> {
    if (blocked.has(listing.platformId)) return listing
    try {
      const description = await this.deps.browser.withPage((page) => readDescription(page, listing))
      await pause(1_500, 3_000)
      return { ...listing, description }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (error instanceof BlockedError) {
        blocked.add(listing.platformId)
        this.log('aviso', `${getPlatform(listing.platformId).name} bloqueou a leitura dos anúncios (${message}). Seguindo só com o texto do card.`)
      } else {
        this.log('aviso', `Descrição de "${listing.title}" não lida: ${message}`)
      }
      return listing
    }
  }

  private createGemini(settings: Settings): GeminiClient | null {
    const key = this.deps.settings.getGeminiKey()
    if (!key) return null
    return new GeminiClient(key, settings.geminiModel)
  }

  private async identify(
    gemini: GeminiClient,
    listing: Listing
  ): Promise<{ identification: ProductIdentification | null; fatal: boolean }> {
    try {
      const identification = await gemini.identify(listing, await fetchImage(listing.image))
      await pause(AI_CALL_GAP_MS, AI_CALL_GAP_MS + 500)
      return { identification, fatal: false }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.log('aviso', `IA: ${message} Usando análise sem IA para "${listing.title}".`)
      return { identification: null, fatal: isFatalGeminiError(message) }
    }
  }

  private checkCancel(): void {
    if (this.cancelRequested) throw new CancelledError('cancelado')
  }

  private finish(message: string, level: ScanLogLevel = 'ok'): void {
    this.log(level, message)
    this.update({ running: false, message, finishedAt: new Date().toISOString() })
  }

  private log(level: ScanLogLevel, message: string): void {
    const entry = { at: new Date().toISOString(), level, message }
    this.update({ log: [...this.status.log, entry].slice(-MAX_LOG_ENTRIES) })
  }

  private update(patch: Partial<ScanStatus>): void {
    this.status = { ...this.status, ...patch }
    this.deps.onStatus(this.status)
  }
}
