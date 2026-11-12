import { describe, expect, it } from 'vitest'
import { detectFlags } from './risks'

const levels = (flags: ReturnType<typeof detectFlags>): string[] => flags.map((f) => f.level)

describe('detectFlags', () => {
  it('flags suspicious low prices as possible scam', () => {
    const flags = detectFlags({ text: 'iPhone 13', price: 500, marketPrice: 2000, comparablesCount: 5 })
    expect(flags.some((f) => f.level === 'alto' && /golpe/i.test(f.text))).toBe(true)
  })

  it.each([
    'iCloud bloqueado',
    'não liga',
    'para retirada de peças',
    'com defeito na tela',
    'disco travado no console',
    'manete as vezes dá drift',
    'não lê disco',
    'controle com problema no analógico'
  ])(
    'flags defect keywords: %s',
    (text) => {
      expect(levels(detectFlags({ text, price: 1500, marketPrice: 2000, comparablesCount: 5 }))).toContain('alto')
    }
  )

  it.each(['sem defeito nenhum, sem drift nos controles', 'não tem defeito, funcionando tudo', 'nenhum problema, zero defeito'])(
    'não acusa defeito negado na descrição: %s',
    (text) => {
      expect(levels(detectFlags({ text, price: 1500, marketPrice: 2000, comparablesCount: 5 }))).not.toContain('alto')
    }
  )

  it('acusa o defeito real mesmo se outra frase nega outro', () => {
    const text = 'sem riscos na carcaça, mas o controle tem drift'
    expect(levels(detectFlags({ text, price: 1500, marketPrice: 2000, comparablesCount: 5 }))).toContain('alto')
  })

  it('flags replicas as medium risk', () => {
    expect(levels(detectFlags({ text: 'AirPods réplica primeira linha', price: 100, marketPrice: null, comparablesCount: 0 }))).toContain('medio')
  })

  it('marks sellers in a hurry as a good sign', () => {
    expect(levels(detectFlags({ text: 'Vendo urgente, mudança', price: 1500, marketPrice: 2000, comparablesCount: 5 }))).toContain('bom')
  })

  it('warns when there are few comparables', () => {
    const flags = detectFlags({ text: 'Produto raro', price: 100, marketPrice: 200, comparablesCount: 1 })
    expect(flags.some((f) => f.level === 'info' && /poucos/i.test(f.text))).toBe(true)
  })

  it('returns no flags for a clean, well-priced listing', () => {
    expect(detectFlags({ text: 'iPhone 13 128GB', price: 1700, marketPrice: 2000, comparablesCount: 6 })).toEqual([])
  })
})
