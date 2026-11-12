/** Validação (zod) de tudo que entra pelo IPC ou é lido do disco. */
import { z } from 'zod'
import { PLATFORMS, type PlatformId } from '../../shared/platforms'
import type {
  ChannelFee,
  Opportunity,
  OpportunityStatus,
  Purchase,
  PurchaseInput,
  SaleInput,
  SavedSearch,
  SearchInput,
  Settings
} from '../../shared/types'

const MAX_PRICE = 10_000_000
const platformIds = PLATFORMS.map((p) => p.id) as [PlatformId, ...PlatformId[]]
const searchPlatformIds = PLATFORMS.filter((p) => p.roles.buscaOfertas).map((p) => p.id) as [PlatformId, ...PlatformId[]]

const platformIdSchema = z.enum(platformIds)
const price = z.number().finite().min(0).max(MAX_PRICE)
const isoDate = z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Data inválida')
const httpsUrl = z.string().url().refine((v) => v.startsWith('https://'), 'URL precisa ser https')

const searchInputSchema = z
  .object({
    query: z.string().trim().min(2, 'Digite pelo menos 2 letras').max(100),
    minPrice: price.nullable(),
    maxPrice: price.nullable(),
    platforms: z.array(z.enum(searchPlatformIds)).min(1, 'Escolha ao menos uma plataforma'),
    active: z.boolean()
  })
  .refine((s) => s.minPrice === null || s.maxPrice === null || s.minPrice <= s.maxPrice, {
    message: 'O preço mínimo não pode ser maior que o máximo'
  })
  .transform((s) => ({ ...s, platforms: [...new Set(s.platforms)] }))

const savedSearchSchema = z.object({
  id: z.string().min(1),
  query: z.string(),
  minPrice: price.nullable(),
  maxPrice: price.nullable(),
  platforms: z.array(platformIdSchema),
  active: z.boolean(),
  createdAt: isoDate,
  lastRunAt: isoDate.nullable()
})

const purchaseInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  platformId: platformIdSchema,
  paidPrice: price,
  listingUrl: httpsUrl.nullable(),
  opportunityId: z.string().max(500).nullable(),
  notes: z.string().max(1000)
})

const purchaseSchema = purchaseInputSchema.extend({
  id: z.string().min(1),
  boughtAt: isoDate,
  soldPrice: price.nullable(),
  soldAt: isoDate.nullable(),
  soldChannel: platformIdSchema.nullable()
})

const saleInputSchema = z.object({ soldPrice: price, soldChannel: platformIdSchema })

const opportunityStatusSchema = z.enum(['nova', 'vista', 'descartada', 'comprada'])

/** Validação leve: dados gerados pelo próprio app; só garante o essencial para a interface. */
const storedOpportunitySchema = z.looseObject({
  id: z.string(),
  searchId: z.string(),
  status: opportunityStatusSchema,
  foundAt: isoDate,
  listing: z.looseObject({ url: z.string(), title: z.string(), price: z.number() }),
  analysis: z.looseObject({ score: z.number(), flags: z.array(z.unknown()) })
})

const fee = (percent: number, fixed: number): ChannelFee => ({ percent, fixed, shipping: 0 })

export const DEFAULT_SETTINGS: Settings = {
  aiEngine: 'claude',
  geminiModel: 'gemini-flash-lite-latest',
  claudeModel: 'haiku',
  fees: {
    facebook: fee(0, 0),
    olx: fee(0, 0),
    mercadolivre: fee(14, 6),
    enjoei: fee(20, 4),
    shopee: fee(20, 4),
    buscape: fee(0, 0)
  },
  quickSaleDiscountPct: 12,
  extraCostPerPurchase: 0,
  olxRegionPath: '',
  scan: { autoEnabled: false, intervalMinutes: 60, maxPerPlatform: 20, maxAnalysesPerRun: 25, minScoreToNotify: 7 }
}

const feeSchema = z.object({
  percent: z.number().min(0).max(60),
  fixed: z.number().min(0).max(500),
  shipping: z.number().min(0).max(500)
})

const feesSchema = z.object(
  Object.fromEntries(platformIds.map((id) => [id, feeSchema.default(DEFAULT_SETTINGS.fees[id])])) as Record<
    PlatformId,
    z.ZodDefault<typeof feeSchema>
  >
)

const scanDefaults = DEFAULT_SETTINGS.scan
const settingsSchema = z.object({
  aiEngine: z.enum(['gemini', 'claude']).default(DEFAULT_SETTINGS.aiEngine),
  geminiModel: z.string().trim().regex(/^[a-z0-9.-]{3,60}$/, 'Modelo inválido').default(DEFAULT_SETTINGS.geminiModel),
  claudeModel: z.enum(['haiku', 'sonnet', 'opus']).default('haiku'),
  fees: feesSchema.default(DEFAULT_SETTINGS.fees),
  quickSaleDiscountPct: z.number().min(0).max(50).default(DEFAULT_SETTINGS.quickSaleDiscountPct),
  extraCostPerPurchase: z.number().min(0).max(5000).default(DEFAULT_SETTINGS.extraCostPerPurchase),
  olxRegionPath: z
    .string()
    .trim()
    .regex(/^([a-z0-9-]+(\/[a-z0-9-]+)*)?$/, 'Região inválida (use só o caminho, ex.: estado-sp/regiao-de-bauru-e-marilia)')
    .default(''),
  scan: z
    .object({
      autoEnabled: z.boolean().default(scanDefaults.autoEnabled),
      intervalMinutes: z.number().int().min(30, 'Intervalo mínimo: 30 minutos').max(1440).default(scanDefaults.intervalMinutes),
      maxPerPlatform: z.number().int().min(5).max(50).default(scanDefaults.maxPerPlatform),
      maxAnalysesPerRun: z.number().int().min(1).max(100).default(scanDefaults.maxAnalysesPerRun),
      minScoreToNotify: z.number().min(0).max(10).default(scanDefaults.minScoreToNotify)
    })
    .default(scanDefaults)
})

function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Dados inválidos'
}

function parseOrThrow<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw)
  if (!result.success) throw new Error(firstIssue(result.error))
  return result.data
}

function parseList<T>(schema: z.ZodType<T>, raw: unknown): T[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const result = schema.safeParse(item)
    return result.success ? [result.data] : []
  })
}

export const parseSearchInput = (raw: unknown): SearchInput => parseOrThrow(searchInputSchema, raw)
export const parsePurchaseInput = (raw: unknown): PurchaseInput => parseOrThrow(purchaseInputSchema, raw)
export const parseSaleInput = (raw: unknown): SaleInput => parseOrThrow(saleInputSchema, raw)
export const parseOpportunityStatus = (raw: unknown): OpportunityStatus => parseOrThrow(opportunityStatusSchema, raw)
export const parseSettings = (raw: unknown): Settings => parseOrThrow(settingsSchema, raw ?? {})
export const parseId = (raw: unknown): string => parseOrThrow(z.string().min(1).max(500), raw)
/** Lista de ids (seleção): descarta silenciosamente qualquer item fora do formato. */
export const parseIds = (raw: unknown): string[] =>
  Array.isArray(raw) ? raw.flatMap((x) => (typeof x === 'string' && x.length > 0 && x.length <= 500 ? [x] : [])) : []

export const parseSearches = (raw: unknown): SavedSearch[] => parseList(savedSearchSchema, raw)
export const parsePurchases = (raw: unknown): Purchase[] => parseList(purchaseSchema, raw)
export const parseOpportunities = (raw: unknown): Opportunity[] =>
  parseList(storedOpportunitySchema, raw) as unknown as Opportunity[]

/** Lê as configurações salvas; valores inválidos voltam ao padrão. */
export function parseStoredSettings(raw: unknown): Settings {
  try {
    return parseSettings(raw)
  } catch {
    return DEFAULT_SETTINGS
  }
}
