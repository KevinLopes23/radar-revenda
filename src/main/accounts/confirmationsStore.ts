import { readFileSync, renameSync, writeFileSync } from 'node:fs'
import { isPlatformId, type PlatformId } from '../../shared/platforms'

/** Data (ISO-8601) em que o usuário confirmou o login manualmente, por plataforma. */
export type Confirmations = Readonly<Partial<Record<PlatformId, string>>>

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) && value.includes('T')
}

/** Valida o conteúdo lido do disco, descartando qualquer entrada inesperada. */
export function parseConfirmations(raw: unknown): Confirmations {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {}
  const entries = Object.entries(raw).filter(([key, value]) => isPlatformId(key) && isIsoDate(value))
  return Object.fromEntries(entries) as Confirmations
}

/** Persiste as confirmações manuais em um JSON no diretório de dados do app. */
export class ConfirmationsStore {
  constructor(private readonly filePath: string) {}

  load(): Confirmations {
    try {
      return parseConfirmations(JSON.parse(readFileSync(this.filePath, 'utf8')))
    } catch {
      // Arquivo ausente ou corrompido: começa do zero (só perde confirmações manuais).
      return {}
    }
  }

  save(confirmations: Confirmations): void {
    const tmpPath = `${this.filePath}.tmp`
    writeFileSync(tmpPath, JSON.stringify(confirmations, null, 2), 'utf8')
    renameSync(tmpPath, this.filePath)
  }
}
