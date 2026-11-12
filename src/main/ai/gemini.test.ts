import { ApiError } from '@google/genai'
import { describe, expect, it } from 'vitest'
import { createGenAI, describeGeminiError } from './gemini'

describe('createGenAI', () => {
  it('usa a API v1beta: na v1 o alias padrão gemini-flash-latest dá 404', () => {
    expect(createGenAI('chave')['apiVersion']).toBe('v1beta')
  })

  it('limita cada chamada a 90 s: com o Gemini sobrecarregado a varredura ficava presa', () => {
    expect(createGenAI('chave')['httpOptions']?.timeout).toBe(90_000)
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
