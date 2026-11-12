/**
 * Motor de IA da análise: abstrai QUEM identifica o produto de cada anúncio.
 * Hoje há dois — Gemini (API do Google) e Claude local (CLI do Claude Code nesta máquina).
 * O scanService escolhe o motor pelas configurações e chama identifyAll uma vez por busca.
 */
import type { Listing, Settings } from '../../shared/types'
import type { ProductIdentification } from '../analysis/analyzer'
import { ClaudeLocalEngine } from './claudeLocal'
import { fetchImage, GeminiClient, isFatalGeminiError, type InlineImage } from './gemini'

export interface EngineHooks {
  /** Progresso (analisados, total) para a barra de status. */
  readonly onProgress?: (done: number, total: number) => void
  /** Avisos não fatais (um anúncio sem IA, formato inesperado) para o log da varredura. */
  readonly onWarn?: (message: string) => void
}

export interface AiEngine {
  /** Nome curto do motor, mostrado no status ("Gemini", "Claude"). */
  readonly label: string
  /** Identifica vários anúncios. Retorna por id do anúncio; ausente = ficou sem IA. */
  identifyAll(listings: readonly Listing[], hooks?: EngineHooks): Promise<Map<string, ProductIdentification>>
}

/** Pausa entre chamadas do Gemini: ritmo calmo evita estourar o limite por minuto. */
export const AI_CALL_GAP_MS = 4_000
const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Gemini: um anúncio por chamada (com a foto). Erro passageiro pula o anúncio e segue;
 * erro definitivo (chave/limite/modelo) desliga a IA no resto da busca para não insistir à toa.
 */
export class GeminiEngine implements AiEngine {
  readonly label = 'Gemini'

  constructor(
    private readonly client: GeminiClient,
    private readonly sleep: (ms: number) => Promise<void> = defaultSleep,
    private readonly loadImage: (url: string | null) => Promise<InlineImage | null> = fetchImage
  ) {}

  async identifyAll(listings: readonly Listing[], hooks?: EngineHooks): Promise<Map<string, ProductIdentification>> {
    const out = new Map<string, ProductIdentification>()
    let aiOff = false
    for (const [index, listing] of listings.entries()) {
      if (!aiOff) {
        try {
          const identification = await this.client.identify(listing, await this.loadImage(listing.image))
          out.set(listing.id, identification)
          await this.sleep(AI_CALL_GAP_MS)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          hooks?.onWarn?.(`IA: ${message} Anúncio "${listing.title}" ficou sem IA.`)
          if (isFatalGeminiError(message)) {
            aiOff = true
            hooks?.onWarn?.('IA desligada nesta rodada; seguindo com a análise simples.')
          }
        }
      }
      hooks?.onProgress?.(index + 1, listings.length)
    }
    return out
  }
}

export interface EngineFactoryDeps {
  readonly settings: Settings
  readonly getGeminiKey: () => string | null
}

/** Cria o motor conforme as configurações. null = Gemini escolhido mas sem chave (segue sem IA). */
export function createEngine(deps: EngineFactoryDeps): AiEngine | null {
  if (deps.settings.aiEngine === 'claude') return new ClaudeLocalEngine(deps.settings.claudeModel)
  const key = deps.getGeminiKey()
  if (!key) return null
  return new GeminiEngine(new GeminiClient(key, deps.settings.geminiModel))
}
