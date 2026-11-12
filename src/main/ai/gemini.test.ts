import { ApiError, type GoogleGenAI } from '@google/genai'
import { describe, expect, it } from 'vitest'
import type { Listing } from '../../shared/types'
import { createGenAI, describeGeminiError, FALLBACK_MODEL, GeminiClient, isFatalGeminiError } from './gemini'

describe('createGenAI', () => {
  it('usa a API v1beta: na v1 o alias padrão gemini-flash-latest dá 404', () => {
    expect(createGenAI('chave')['apiVersion']).toBe('v1beta')
  })

  it('limita cada chamada a 90 s: com o Gemini sobrecarregado a varredura ficava presa', () => {
    expect(createGenAI('chave')['httpOptions']?.timeout).toBe(90_000)
  })
})

describe('GeminiClient.identify', () => {
  const answer = {
    productName: 'PlayStation 4 Slim 500GB',
    productQuery: 'playstation 4 slim 500gb',
    condition: 'usado',
    isAccessory: false,
    risks: [],
    defects: ['Controles com defeito na placa wireless'],
    defectSeverity: 'leve',
    repairCost: 150,
    verdict: 'Compensa se o preço cobrir a troca dos controles.'
  }
  const fakeAi = () => {
    const prompts: string[] = []
    const ai = {
      models: {
        generateContent: async (req: { contents: { parts: { text?: string }[] }[] }) => {
          prompts.push(req.contents[0]?.parts[0]?.text ?? '')
          return { text: JSON.stringify(answer) }
        }
      }
    }
    return { ai: ai as unknown as GoogleGenAI, prompts }
  }
  const listing: Listing = {
    id: 'enjoei:x',
    platformId: 'enjoei',
    url: 'https://www.enjoei.com.br/p/ps4-1',
    title: 'Playstation 4 Slim',
    price: 900,
    image: null,
    location: null,
    text: 'R$ 900\nPlaystation 4 Slim',
    description: 'acompanha dois controles, ambos com defeito na placa wireless <b>urgente</b>'
  }

  it('manda a descrição completa (neutralizada) e lê defeitos, conserto e veredito', async () => {
    const { ai, prompts } = fakeAi()
    const result = await new GeminiClient('k', 'gemini-flash-latest', ai).identify(listing, null)
    expect(prompts[0]).toContain('Descrição completa do anúncio:\nacompanha dois controles, ambos com defeito na placa wireless')
    expect(prompts[0]).not.toContain('<b>')
    expect(result).toMatchObject({ defects: ['Controles com defeito na placa wireless'], defectSeverity: 'leve', repairCost: 150 })
  })

  it('resposta com defeitos demais ou longos é cortada, não derruba a análise', async () => {
    const long = { ...answer, defects: Array.from({ length: 9 }, (_, i) => `defeito ${i} ${'x'.repeat(300)}`), verdict: 'v'.repeat(500) }
    const ai = { models: { generateContent: async () => ({ text: JSON.stringify(long) }) } } as unknown as GoogleGenAI
    const result = await new GeminiClient('k', 'm', ai).identify(listing, null)
    expect(result.defects).toHaveLength(6)
    expect(result.defects?.[0]?.length).toBe(200)
    expect(result.verdict?.length).toBe(300)
  })

  it('sem descrição, avisa a IA que só há o texto do card', async () => {
    const { ai, prompts } = fakeAi()
    await new GeminiClient('k', 'gemini-flash-latest', ai).identify({ ...listing, description: null }, null)
    expect(prompts[0]).toContain('Descrição completa do anúncio:\n(não disponível)')
  })
})

describe('GeminiClient: modelo reserva', () => {
  const ok = { text: JSON.stringify({ productName: 'PS4', productQuery: 'ps4', condition: 'usado', isAccessory: false, risks: [], defects: [], defectSeverity: 'nenhum', repairCost: 0, verdict: 'Compensa.' }) }
  const fakeAi = (failing: ReadonlySet<string>, status = 429) => {
    const calls: string[] = []
    const ai = {
      models: {
        generateContent: async ({ model }: { model: string }) => {
          calls.push(model)
          if (failing.has(model)) throw new ApiError({ status, message: 'RESOURCE_EXHAUSTED' })
          return ok
        }
      }
    }
    return { ai: ai as unknown as GoogleGenAI, calls }
  }
  const listing: Listing = { id: 'olx:x', platformId: 'olx', url: 'https://olx.com.br/x', title: 'PS4', price: 500, image: null, location: null, text: 'PS4' }

  it('limite no modelo escolhido: passa para o flash-lite e continua nele', async () => {
    const { ai, calls } = fakeAi(new Set(['gemini-flash-latest']))
    const client = new GeminiClient('k', 'gemini-flash-latest', ai)
    await client.identify(listing, null)
    await client.identify(listing, null)
    expect(calls).toEqual(['gemini-flash-latest', FALLBACK_MODEL, FALLBACK_MODEL])
  })

  it('modelo sobrecarregado (503) também passa para o reserva', async () => {
    const { ai, calls } = fakeAi(new Set(['gemini-flash-latest']), 503)
    await new GeminiClient('k', 'gemini-flash-latest', ai).identify(listing, null)
    expect(calls).toEqual(['gemini-flash-latest', FALLBACK_MODEL])
  })

  it('só chave, limite, modelo e timeout desligam a IA na rodada (503 passageiro não)', () => {
    expect(isFatalGeminiError(describeGeminiError(new ApiError({ status: 429, message: 'x' })))).toBe(true)
    expect(isFatalGeminiError(describeGeminiError(new ApiError({ status: 403, message: 'x' })))).toBe(true)
    expect(isFatalGeminiError(describeGeminiError(new ApiError({ status: 503, message: 'high demand' })))).toBe(false)
    expect(isFatalGeminiError('O Gemini respondeu num formato inesperado.')).toBe(false)
  })

  it('outros erros não trocam de modelo', async () => {
    const { ai, calls } = fakeAi(new Set(['gemini-flash-latest']), 403)
    await expect(new GeminiClient('k', 'gemini-flash-latest', ai).identify(listing, null)).rejects.toThrow(/Chave/)
    expect(calls).toEqual(['gemini-flash-latest'])
  })
})

describe('describeGeminiError', () => {
  const api = (status: number, message: string): ApiError => new ApiError({ status, message })

  it('404 com "generateContent" no texto é modelo, não limite', () => {
    const raw = 'models/gemini-flash-latest is not found for API version v1, or is not supported for generateContent.'
    expect(describeGeminiError(api(404, raw))).toMatch(/Modelo/)
  })

  it('classifica pelo status HTTP', () => {
    expect(describeGeminiError(api(400, 'API key not valid. API_KEY_INVALID'))).toMatch(/Chave/)
    expect(describeGeminiError(api(403, 'forbidden'))).toMatch(/Chave/)
    expect(describeGeminiError(api(429, 'RESOURCE_EXHAUSTED'))).toMatch(/Limite/)
    expect(describeGeminiError(api(503, 'high demand'))).toMatch(/HTTP 503/)
  })

  it('timeout do SDK vira mensagem clara em português', () => {
    const err = Object.assign(new Error('This operation was aborted'), { name: 'AbortError' })
    expect(describeGeminiError(err)).toMatch(/demorou demais/)
  })

  it('sem status, olha palavras inteiras', () => {
    expect(describeGeminiError(new Error('RESOURCE_EXHAUSTED: quota exceeded'))).toMatch(/Limite/)
    expect(describeGeminiError(new Error('Failed to generate content'))).not.toMatch(/Limite/)
  })
})
