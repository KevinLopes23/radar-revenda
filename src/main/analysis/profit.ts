/** Lucro por canal de revenda e nota da oportunidade (funções puras). */
import type { PlatformId } from '../../shared/platforms'
import type { ChannelFee, ChannelProfit, Flag } from '../../shared/types'

const MAX_MARGIN_POINTS = 6
const MARGIN_POINTS_PER_UNIT = 20
const MAX_PROFIT_POINTS = 2
const PROFIT_PER_POINT = 150
const PENALTY: Readonly<Record<Flag['level'], number>> = { alto: -3.5, medio: -1.5, info: 0, bom: 0.5 }

const round2 = (value: number): number => Math.round(value * 100) / 100
const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value))

interface ChannelProfitInput {
  readonly salePrice: number
  readonly fee: ChannelFee
  readonly cost: number
  readonly extraCost: number
}

export function channelProfit({ salePrice, fee, cost, extraCost }: ChannelProfitInput): { fees: number; profit: number } {
  const fees = round2((salePrice * fee.percent) / 100 + fee.fixed + fee.shipping)
  return { fees, profit: round2(salePrice - fees - cost - extraCost) }
}

interface ComputeChannelsInput {
  readonly marketPrice: number
  readonly quickSaleDiscountPct: number
  readonly cost: number
  readonly extraCost: number
  readonly fees: Readonly<Partial<Record<PlatformId, ChannelFee>>>
  readonly channels: readonly PlatformId[]
}

/** Lucro estimado em cada canal de revenda, do mais lucrativo para o menos. */
export function computeChannels(input: ComputeChannelsInput): ChannelProfit[] {
  const salePrice = round2(input.marketPrice * (1 - input.quickSaleDiscountPct / 100))
  return input.channels
    .flatMap((platformId) => {
      const fee = input.fees[platformId]
      if (!fee) return []
      const result = channelProfit({ salePrice, fee, cost: input.cost, extraCost: input.extraCost })
      return [{ platformId, salePrice, ...result }]
    })
    .sort((a, b) => b.profit - a.profit)
}

interface ScoreInput {
  readonly profit: number | null
  readonly cost: number
  readonly comparablesCount: number
  readonly flags: readonly Flag[]
}

function confidencePoints(comparablesCount: number): number {
  if (comparablesCount >= 5) return 2
  if (comparablesCount >= 3) return 1
  return 0
}

/** Nota de 0 a 10: margem, lucro absoluto, confiança no preço de mercado e riscos. */
export function scoreOpportunity({ profit, cost, comparablesCount, flags }: ScoreInput): number {
  if (profit === null || profit <= 0 || cost <= 0) return 0
  const marginPoints = Math.min(MAX_MARGIN_POINTS, (profit / cost) * MARGIN_POINTS_PER_UNIT)
  const profitPoints = Math.min(MAX_PROFIT_POINTS, profit / PROFIT_PER_POINT)
  const riskPoints = flags.reduce((sum, flag) => sum + PENALTY[flag.level], 0)
  const total = marginPoints + profitPoints + confidencePoints(comparablesCount) + riskPoints
  return Math.round(clamp(total, 0, 10) * 10) / 10
}
