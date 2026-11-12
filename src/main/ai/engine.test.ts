import { describe, expect, it, vi } from 'vitest'
import type { Listing, Settings } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../data/validation'
import { createEngine, GeminiEngine } from './engine'
import type { GeminiClient } from './gemini'

const listing = (id: string): Listing => ({
  id,
  platformId: 'olx',
  url: `https://olx.com.br/${id}`,
  title: `anúncio ${id}`,
  price: 500,
  image: null,
  location: null,
  text: 'ps4'
})

const identification = {
  productName: 'PS4',
  productQuery: 'ps4',
  condition: 'usado' as const,
  isAccessory: false,
  risks: [],
  defects: [],
  defectSeverity: 'nenhum' as const,
  repairCost: 0,
  verdict: 'Compensa.'
}

const noSleep = async (): Promise<void> => undefined
const noImage = async (): Promise<null> => null

describe('GeminiEngine.identifyAll', () => {
  it('identifica cada anúncio e devolve por id', async () => {
    const client = { identify: vi.fn(async () => identification) } as unknown as GeminiClient
    const result = await new GeminiEngine(client, noSleep, noImage).identifyAll([listing('a'), listing('b')])
    expect(result.get('a')?.productName).toBe('PS4')
    expect(result.get('b')?.productName).toBe('PS4')
  })

  it('erro passageiro num anúncio pula ele e segue nos outros', async () => {
    let calls = 0
    const client = {
      identify: async () => {
        calls += 1
        if (calls === 1) throw new Error('O Gemini está instável agora (sobrecarregado).')
        return identification
      }
    } as unknown as GeminiClient
    const warns: string[] = []
    const result = await new GeminiEngine(client, noSleep, noImage).identifyAll([listing('a'), listing('b')], { onWarn: (m) => warns.push(m) })
    expect(result.has('a')).toBe(false)
    expect(result.get('b')?.productName).toBe('PS4')
    expect(warns.some((w) => w.includes('sem IA'))).toBe(true)
  })

  it('erro definitivo (chave) desliga a IA no resto da busca: não chama mais o Gemini', async () => {
    const identify = vi.fn(async () => {
      throw new Error('Chave do Gemini inválida ou sem permissão.')
    })
    const client = { identify } as unknown as GeminiClient
    const result = await new GeminiEngine(client, noSleep, noImage).identifyAll([listing('a'), listing('b'), listing('c')])
    expect(result.size).toBe(0)
    expect(identify).toHaveBeenCalledTimes(1)
  })

  it('reporta progresso para a barra de status', async () => {
    const client = { identify: async () => identification } as unknown as GeminiClient
    const progress: number[] = []
    await new GeminiEngine(client, noSleep, noImage).identifyAll([listing('a'), listing('b')], { onProgress: (done) => progress.push(done) })
    expect(progress).toEqual([1, 2])
  })
})

describe('createEngine', () => {
  const withEngine = (over: Partial<Settings>): Settings => ({ ...DEFAULT_SETTINGS, ...over })

  it('aiEngine "claude" cria o motor Claude', () => {
    const engine = createEngine({ settings: withEngine({ aiEngine: 'claude' }), getGeminiKey: () => null })
    expect(engine?.label).toBe('Claude')
  })

  it('aiEngine "gemini" com chave cria o motor Gemini', () => {
    const engine = createEngine({ settings: withEngine({ aiEngine: 'gemini' }), getGeminiKey: () => 'uma-chave' })
    expect(engine?.label).toBe('Gemini')
  })

  it('aiEngine "gemini" sem chave não cria motor (segue sem IA)', () => {
    const engine = createEngine({ settings: withEngine({ aiEngine: 'gemini' }), getGeminiKey: () => null })
    expect(engine).toBeNull()
  })
})
