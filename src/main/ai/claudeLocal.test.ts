import { describe, expect, it, vi } from 'vitest'
import type { Listing } from '../../shared/types'
import { ClaudeLocalEngine, testClaudeLocal, type ClaudeRunner } from './claudeLocal'

const listing = (id: string, title: string, description?: string): Listing => ({
  id,
  platformId: 'olx',
  url: `https://olx.com.br/${id}`,
  title,
  price: 1900,
  image: null,
  location: null,
  text: title,
  description: description ?? null
})

const answer = (over: Partial<Record<string, unknown>> = {}): Record<string, unknown> => ({
  productName: 'iPhone 12 Pro Max 128GB',
  productQuery: 'iphone 12 pro max 128gb',
  condition: 'usado',
  isAccessory: false,
  risks: [],
  defects: ['Trinca no canto da tela'],
  defectSeverity: 'leve',
  repairCost: 300,
  verdict: 'Compensa se o preço cobrir a troca da tela.',
  ...over
})

describe('ClaudeLocalEngine.identifyAll', () => {
  it('manda todos os anúncios numa chamada só e pede um array JSON na ordem', async () => {
    let prompt = ''
    const run: ClaudeRunner = async (p) => {
      prompt = p
      return JSON.stringify([answer(), answer({ productName: 'Galaxy S21' })])
    }
    const result = await new ClaudeLocalEngine('haiku', run).identifyAll([listing('a', 'iPhone 12'), listing('b', 'Galaxy S21')])
    expect(prompt).toContain('iPhone 12')
    expect(prompt).toContain('Galaxy S21')
    expect(prompt).toMatch(/ARRAY JSON/i)
    expect(result.get('a')?.productName).toBe('iPhone 12 Pro Max 128GB')
    expect(result.get('b')?.productName).toBe('Galaxy S21')
  })

  it('valida e corta defeitos longos demais sem derrubar a análise', async () => {
    const longDefects = Array.from({ length: 9 }, (_, i) => `defeito ${i} ${'x'.repeat(300)}`)
    const run: ClaudeRunner = async () => JSON.stringify([answer({ defects: longDefects })])
    const result = await new ClaudeLocalEngine('haiku', run).identifyAll([listing('a', 'iPhone')])
    expect(result.get('a')?.defects).toHaveLength(6)
    expect(result.get('a')?.defects?.[0]?.length).toBe(200)
  })

  it('tolera cercas de markdown e texto em volta do array', async () => {
    const run: ClaudeRunner = async () => 'Claro! Aqui está:\n```json\n' + JSON.stringify([answer()]) + '\n```'
    const result = await new ClaudeLocalEngine('haiku', run).identifyAll([listing('a', 'iPhone')])
    expect(result.get('a')?.productName).toBe('iPhone 12 Pro Max 128GB')
  })

  it('se vier menos itens que anúncios, mapeia os que deu e avisa os que faltaram', async () => {
    const run: ClaudeRunner = async () => JSON.stringify([answer()])
    const warns: string[] = []
    const result = await new ClaudeLocalEngine('haiku', run).identifyAll([listing('a', 'iPhone'), listing('b', 'Galaxy')], {
      onWarn: (m) => warns.push(m)
    })
    expect(result.has('a')).toBe(true)
    expect(result.has('b')).toBe(false)
    expect(warns.some((w) => w.includes('Galaxy'))).toBe(true)
  })

  it('resposta sem array JSON vira erro claro (a varredura segue sem IA)', async () => {
    const run: ClaudeRunner = async () => 'desculpe, não consegui'
    await expect(new ClaudeLocalEngine('haiku', run).identifyAll([listing('a', 'iPhone')])).rejects.toThrow(/Claude local falhou/)
  })

  it('sem anúncios, não chama o Claude', async () => {
    const run = vi.fn<ClaudeRunner>(async () => '[]')
    const result = await new ClaudeLocalEngine('haiku', run).identifyAll([])
    expect(run).not.toHaveBeenCalled()
    expect(result.size).toBe(0)
  })
})

describe('testClaudeLocal', () => {
  it('devolve a resposta curta do Claude', async () => {
    const run: ClaudeRunner = async (prompt) => (prompt.includes('ok') ? 'ok' : 'erro')
    expect(await testClaudeLocal('haiku', run)).toBe('ok')
  })
})
