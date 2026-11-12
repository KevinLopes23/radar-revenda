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
  /** Descrição completa lida na página do anúncio (defeitos costumam estar aqui). */
  readonly description?: string | null
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

/** Faixa típica de preços (do 1º ao 3º quartil): o que é barato e o que é caro no mercado. */
export interface PriceRange {
  readonly low: number
  readonly high: number
}

/** Quão fácil é revender: depende de quantos usados do mesmo modelo estão à venda. */
export type Liquidity = 'alta' | 'media' | 'baixa'

export interface Analysis {
  readonly productName: string
  readonly productQuery: string
  readonly condition: ListingCondition
  readonly marketUsedPrice: number | null
  /** O preço do usado acima veio da estimativa da IA (não de anúncios iguais achados na varredura). */
  readonly marketUsedEstimated?: boolean
  readonly marketNewPrice: number | null
  /** Campos abaixo são opcionais porque análises antigas, já salvas, não os têm. */
  readonly usedRange?: PriceRange | null
  readonly liquidity?: Liquidity
  /** Lucro no melhor canal se o produto só sair pelo preço baixo da faixa. */
  readonly worstCaseProfit?: number | null
  readonly comparables: readonly Comparable[]
  readonly channels: readonly ChannelProfit[]
  readonly bestChannel: PlatformId | null
  readonly bestProfit: number | null
  readonly marginPct: number | null
  readonly score: number
  readonly flags: readonly Flag[]
  /** Conserto estimado pela IA a partir da descrição (já descontado do lucro). */
  readonly repairCost?: number | null
  /** Frase da IA dizendo se ainda compensa, considerando os defeitos citados. */
  readonly aiVerdict?: string | null
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

/** Qual IA analisa os anúncios: Gemini (API Google, grátis) ou Claude local (CLI do Claude Code deste PC). */
export type AiEngineId = 'gemini' | 'claude'

export interface Settings {
  /** Motor de análise selecionado. */
  readonly aiEngine: AiEngineId
  readonly geminiModel: string
  /** Modelo do Claude local (haiku | sonnet | opus). */
  readonly claudeModel: string
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
