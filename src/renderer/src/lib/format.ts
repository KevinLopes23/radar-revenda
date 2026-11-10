import { getPlatform, type PlatformId } from '../../../shared/platforms'
import type { ChannelFee, Purchase } from '../../../shared/types'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export function brl(value: number | null): string {
  return value === null ? '—' : currency.format(value)
}

/** Converte texto digitado ("1.234,56", "R$ 2.000") em número. */
export function parseMoney(text: string): number | null {
  const cleaned = text.replace(/[R$\s]/g, '')
  if (!cleaned) return null
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned.replace(/\.(?=\d{3}\b)/g, '')
  const value = Number(normalized)
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : null
}

export function timeAgo(iso: string | null, now = Date.now()): string {
  if (!iso) return 'nunca'
  const diff = now - Date.parse(iso)
  if (diff < MINUTE) return 'agora'
  if (diff < HOUR) return `há ${Math.floor(diff / MINUTE)} min`
  if (diff < DAY) return `há ${Math.floor(diff / HOUR)} h`
  const days = Math.floor(diff / DAY)
  return `há ${days} ${days === 1 ? 'dia' : 'dias'}`
}

export function errorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  return raw.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}

export function platformName(id: PlatformId): string {
  return getPlatform(id).name
}

/** Lucro real de uma venda, descontando as taxas do canal onde foi vendido. */
export function netSaleProfit(purchase: Purchase, fees: Readonly<Record<PlatformId, ChannelFee>> | null): number | null {
  if (purchase.soldPrice === null) return null
  const fee = purchase.soldChannel && fees ? fees[purchase.soldChannel] : null
  const charges = fee ? (purchase.soldPrice * fee.percent) / 100 + fee.fixed + fee.shipping : 0
  return Math.round((purchase.soldPrice - charges - purchase.paidPrice) * 100) / 100
}

export function scoreTone(score: number): 'top' | 'good' | 'meh' | 'low' {
  if (score >= 8) return 'top'
  if (score >= 6) return 'good'
  if (score >= 3) return 'meh'
  return 'low'
}
