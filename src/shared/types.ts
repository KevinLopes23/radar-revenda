/** Tipos de domínio compartilhados entre main, preload e renderer. */
import type { PlatformId } from './platforms'

export type ListingCondition = 'novo' | 'usado' | 'desconhecido'

export interface SearchInput {
  readonly query: string
  readonly minPrice: number | null
  readonly maxPrice: number | null
  readonly platforms: readonly PlatformId[]
  readonly active: boolean
}

export interface SavedSearch extends SearchInput {
  readonly id: string
  readonly createdAt: string
  readonly lastRunAt: string | null
}

/** Anúncio extraído de uma plataforma. */
export interface Listing {
  readonly id: string
  readonly platformId: PlatformId
  readonly url: string
  readonly title: string
  readonly price: number
  readonly image: string | null
  readonly location: string | null
  /** Texto bruto do card (usado para detectar riscos e condição). */
  readonly text: string
}

export interface Comparable {
  readonly platformId: PlatformId
  readonly title: string
  readonly price: number
  readonly url: string
  readonly condition: ListingCondition
}

export interface ChannelProfit {
  readonly platformId: PlatformId
  readonly salePrice: number
  readonly fees: number
  readonly profit: number
}

export type FlagLevel = 'alto' | 'medio' | 'info' | 'bom'

export interface Flag {
  readonly level: FlagLevel
  readonly text: string
}

export interface Analysis {
  readonly productName: string
  readonly productQuery: string
  readonly condition: ListingCondition
  readonly marketUsedPrice: number | null
  readonly marketNewPrice: number | null
  readonly comparables: readonly Comparable[]
  readonly channels: readonly ChannelProfit[]
  readonly bestChannel: PlatformId | null
  readonly bestProfit: number | null
  readonly marginPct: number | null
  readonly score: number
  readonly flags: readonly Flag[]
  readonly aiUsed: boolean
  readonly analyzedAt: string
}

export type OpportunityStatus = 'nova' | 'vista' | 'descartada' | 'comprada'

export interface Opportunity {
  readonly id: string
  readonly searchId: string
  readonly listing: Listing
  readonly analysis: Analysis
  readonly status: OpportunityStatus
  readonly foundAt: string
}

export interface PurchaseInput {
  readonly title: string
  readonly platformId: PlatformId
  readonly paidPrice: number
  readonly listingUrl: string | null
  readonly opportunityId: string | null
  readonly notes: string
}

export interface Purchase extends PurchaseInput {
  readonly id: string
  readonly boughtAt: string
  readonly soldPrice: number | null
  readonly soldAt: string | null
  readonly soldChannel: PlatformId | null
}

export interface SaleInput {
  readonly soldPrice: number
  readonly soldChannel: PlatformId
}

export interface ChannelFee {
  /** Comissão em % do preço de venda. */
  readonly percent: number
  /** Taxa fixa por venda (R$). */
  readonly fixed: number
  /** Custo de envio que fica com você (R$). */
  readonly shipping: number
}

export interface ScanSettings {
  readonly autoEnabled: boolean
  readonly intervalMinutes: number
  readonly maxPerPlatform: number
  readonly maxAnalysesPerRun: number
  readonly minScoreToNotify: number
}

export interface Settings {
  readonly geminiModel: string
  readonly fees: Readonly<Record<PlatformId, ChannelFee>>
  /** Desconto sobre o preço de mercado para vender rápido (%). */
  readonly quickSaleDiscountPct: number
  /** Custo extra por compra: deslocamento, limpeza etc. (R$). */
  readonly extraCostPerPurchase: number
  /** Caminho da região na OLX, ex.: "estado-sp/regiao-de-bauru-e-marilia" (vazio = Brasil). */
  readonly olxRegionPath: string
  readonly scan: ScanSettings
}

export interface SettingsView extends Settings {
  readonly hasGeminiKey: boolean
}

export type ScanLogLevel = 'info' | 'ok' | 'aviso' | 'erro'

export interface ScanLogEntry {
  readonly at: string
  readonly level: ScanLogLevel
  readonly message: string
}

export interface ScanStatus {
  readonly running: boolean
  readonly message: string
  readonly startedAt: string | null
  readonly finishedAt: string | null
  readonly nextRunAt: string | null
  readonly log: readonly ScanLogEntry[]
}

export interface GeminiTestResult {
  readonly ok: boolean
  readonly message: string
}
