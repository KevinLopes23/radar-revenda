/** Alertas de risco e sinais positivos de um anúncio (funções puras). */
import type { Flag } from '../../shared/types'
import { normalizeText } from './text'

const SCAM_PRICE_RATIO = 0.4
const MIN_RELIABLE_COMPARABLES = 3

const DEFECT_PATTERN =
  /\b(icloud|bloquead[oa]|nao liga|retirada de pecas|para pecas|defeito|tela (quebrada|trincada)|sem face ?id|conta google|placa queimada|molhou|oxidad[oa]|nao carrega|nao funciona)\b/
const REPLICA_PATTERN = /\b(replica|primeira linha|clone|paralel[oa]|sem nota|nao tenho nota|nao possui nota)\b/
const HURRY_PATTERN = /\b(urgente|mudanca|preciso vender|viagem|precisando|queima)\b/

interface FlagInput {
  readonly text: string
  readonly price: number
  readonly marketPrice: number | null
  readonly comparablesCount: number
}

export function detectFlags({ text, price, marketPrice, comparablesCount }: FlagInput): Flag[] {
  const normalized = normalizeText(text)
  const flags: Flag[] = []

  if (marketPrice !== null && price < marketPrice * SCAM_PRICE_RATIO) {
    const pct = Math.round((price / marketPrice) * 100)
    flags.push({
      level: 'alto',
      text: `Preço ${pct}% do mercado: possível golpe. Nunca pague adiantado e veja o produto funcionando.`
    })
  }

  const defect = DEFECT_PATTERN.exec(normalized)
  if (defect) flags.push({ level: 'alto', text: `Possível defeito ou bloqueio: "${defect[0]}".` })

  const replica = REPLICA_PATTERN.exec(normalized)
  if (replica) flags.push({ level: 'medio', text: `Atenção: "${replica[0]}" — pode não ser original ou não ter nota.` })

  if (HURRY_PATTERN.test(normalized)) flags.push({ level: 'bom', text: 'Vendedor com pressa: dá para negociar.' })

  if (comparablesCount < MIN_RELIABLE_COMPARABLES) {
    flags.push({ level: 'info', text: 'Poucos anúncios parecidos para comparar: preço de mercado pouco confiável.' })
  }

  return flags
}
