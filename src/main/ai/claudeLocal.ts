/**
 * Motor "Claude local": usa o CLI do Claude Code instalado nesta máquina (modo headless `claude -p`)
 * como análise de IA, no lugar da API do Gemini. Roda sob a assinatura do usuário (sem chave paga).
 * Para gastar o mínimo, manda TODOS os anúncios da busca numa única chamada e recebe um array JSON.
 */
import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import type { Listing } from '../../shared/types'
import type { ProductIdentification } from '../analysis/analyzer'
import type { AiEngine, EngineHooks } from './engine'
import { identificationSchema, INSTRUCTIONS } from './gemini'
import { buildListingPrompt } from './listingPrompt'

/** Modelos oferecidos; Haiku é o padrão por ser barato e rápido. */
export const CLAUDE_MODELS = ['haiku', 'sonnet', 'opus'] as const

const CLAUDE_TIMEOUT_MS = 180_000
/** Teto de texto por anúncio no lote: evita um prompt gigante com descrições enormes. */
const MAX_LISTING_CHARS = 2_000
const CLAUDE_FAIL = 'A análise pelo Claude local falhou'

/** Executa o Claude headless e devolve o TEXTO da resposta (campo `result` do JSON do CLI). */
export type ClaudeRunner = (prompt: string, model: string) => Promise<string>

const BATCH_INSTRUCTIONS = `${INSTRUCTIONS}

Você vai receber VÁRIOS anúncios, cada um com um índice. Responda APENAS com um ARRAY JSON — um objeto por anúncio, NA MESMA ORDEM e na mesma quantidade. Não escreva nada fora do array nem use blocos de markdown.
Cada objeto: productName (string), productQuery (string em minúsculas, sem cor), condition ("novo"|"usado"|"desconhecido"), isAccessory (boolean), risks (string[], até 3), defects (string[]: defeitos, avarias ou peças faltando que o vendedor cita; vazio se nada), defectSeverity ("nenhum"|"leve"|"grave"), repairCost (number em reais, 0 se sem defeito), verdict (string curta: ainda compensa revender?), usedMarketPriceBRL (number: preço médio de um USADO deste mesmo modelo/capacidade à venda no Brasil hoje, pelo seu conhecimento de mercado, NÃO o preço pedido no anúncio; 0 se for acessório ou não souber).`

function buildBatchPrompt(listings: readonly Listing[]): string {
  const blocks = listings.map(
    (listing, index) => `<anuncio indice="${index}">\n${buildListingPrompt(listing).slice(0, MAX_LISTING_CHARS)}\n</anuncio>`
  )
  return `${BATCH_INSTRUCTIONS}\n\nSão ${listings.length} anúncio(s):\n\n${blocks.join('\n\n')}`
}

/** Pega o array JSON da resposta, tolerando texto ou cercas de markdown em volta. */
function extractJsonArray(text: string): unknown {
  const start = text.indexOf('[')
  const end = text.lastIndexOf(']')
  if (start === -1 || end === -1 || end < start) throw new Error('resposta sem array JSON')
  return JSON.parse(text.slice(start, end + 1))
}

export class ClaudeLocalEngine implements AiEngine {
  readonly label = 'Claude'

  constructor(
    private readonly model: string,
    private readonly run: ClaudeRunner = spawnClaude
  ) {}

  async identifyAll(listings: readonly Listing[], hooks?: EngineHooks): Promise<Map<string, ProductIdentification>> {
    const out = new Map<string, ProductIdentification>()
    if (listings.length === 0) return out
    const parsed = await this.callAndParse(listings)
    const items = Array.isArray(parsed) ? parsed : []
    listings.forEach((listing, index) => {
      const result = identificationSchema.safeParse(items[index])
      if (result.success) out.set(listing.id, result.data)
      else hooks?.onWarn?.(`IA: anúncio "${listing.title}" veio num formato inesperado do Claude.`)
      hooks?.onProgress?.(index + 1, listings.length)
    })
    return out
  }

  private async callAndParse(listings: readonly Listing[]): Promise<unknown> {
    let answer: string
    try {
      answer = await this.run(buildBatchPrompt(listings), this.model)
    } catch (error) {
      throw new Error(`${CLAUDE_FAIL}: ${error instanceof Error ? error.message : String(error)}`)
    }
    try {
      return extractJsonArray(answer)
    } catch (error) {
      throw new Error(`${CLAUDE_FAIL}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
}

/** Teste rápido do Claude local (botão "Testar Claude" nas Configurações). */
export async function testClaudeLocal(model: string, run: ClaudeRunner = spawnClaude): Promise<string> {
  const answer = await run('Responda apenas: ok', model)
  return answer.trim().slice(0, 50) || 'ok'
}

function claudeSpawnError(error: NodeJS.ErrnoException): string {
  if (error.code === 'ENOENT') {
    return 'Claude Code não encontrado. Abra o Claude Code uma vez e confirme que o comando "claude" funciona neste PC.'
  }
  return error.message
}

function extractResult(stdout: string): string {
  const parsed = JSON.parse(stdout) as { result?: unknown }
  if (typeof parsed.result !== 'string') throw new Error('resposta do Claude sem campo result')
  return parsed.result
}

/** Dispara `claude -p --output-format json --model <m>`, com o prompt pela entrada padrão. */
function spawnClaude(prompt: string, model: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const bin = process.env['CLAUDE_BIN'] || 'claude'
    const child = spawn(bin, ['-p', '--output-format', 'json', '--model', model], {
      cwd: tmpdir(), // diretório neutro: não carrega o CLAUDE.md nem as regras do projeto (mais barato e isolado)
      shell: true, // no Windows o executável é claude.cmd; resolvido pelo shell. Os argumentos são fixos (o anúncio vai por stdin).
      windowsHide: true,
      env: process.env
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill()
      reject(new Error('o Claude demorou demais para responder'))
    }, CLAUDE_TIMEOUT_MS)
    child.stdout.on('data', (chunk) => (stdout += chunk))
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', (error: NodeJS.ErrnoException) => {
      clearTimeout(timer)
      reject(new Error(claudeSpawnError(error)))
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) return reject(new Error(stderr.trim().slice(0, 200) || `o Claude saiu com código ${code}`))
      try {
        resolve(extractResult(stdout))
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)))
      }
    })
    child.stdin.end(prompt)
  })
}
