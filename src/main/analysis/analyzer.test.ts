import { describe, expect, it } from 'vitest'
import type { Comparable, Listing } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../data/validation'
import { analyzeListing } from './analyzer'

let seq = 0
const listing = (title: string, price: number, text = title): Listing => {
  seq += 1
  return {
    id: `olx:https://olx.com.br/item-${seq}`,
    platformId: 'olx',
    url: `https://olx.com.br/item-${seq}`,
    title,
    price,
    image: null,
    location: null,
    text
  }
}

const target = listing('iPhone 13 128GB azul', 1500)
const pool: Listing[] = [
  target,
  listing('iPhone 13 128GB preto', 2100),
  listing('Apple iPhone 13 128GB seminovo', 2200),
  listing('iPhone 13 128 GB', 2000),
  listing('iPhone 13 128GB rosa', 2300),
  listing('iPhone 13 Pro 128GB', 3200),
  listing('Capinha iPhone 13', 30)
]
const newRefs: Comparable[] = [
  { platformId: 'buscape', title: 'iPhone 13 128GB', price: 3500, url: 'https://buscape.com.br/a', condition: 'novo' }
]

describe('analyzeListing', () => {
  const analysis = analyzeListing({ listing: target, pool, newReferences: newRefs, identification: null, settings: DEFAULT_SETTINGS })

  it('uses only comparable listings (same model, no accessories, excluding itself)', () => {
    expect(analysis.comparables.filter((c) => c.condition !== 'novo').map((c) => c.price).sort()).toEqual([2000, 2100, 2200, 2300])
  })

  it('computes market prices', () => {
    expect(analysis.marketUsedPrice).toBe(2150)
    expect(analysis.marketNewPrice).toBe(3500)
  })

  it('computes the best resale channel and a positive profit', () => {
    expect(analysis.bestChannel).not.toBeNull()
    expect(analysis.bestProfit).toBeGreaterThan(350)
    expect(analysis.channels[0]?.profit).toBe(analysis.bestProfit)
  })

  it('scores a good deal highly', () => {
    expect(analysis.score).toBeGreaterThanOrEqual(7)
  })

  it('uses the AI identification when provided', () => {
    const withAi = analyzeListing({
      listing: target,
      pool,
      newReferences: newRefs,
      identification: { productName: 'Apple iPhone 13 128GB', productQuery: 'iphone 13 128gb', condition: 'usado', isAccessory: false, risks: ['Bateria não informada'] },
      settings: DEFAULT_SETTINGS
    })
    expect(withAi.aiUsed).toBe(true)
    expect(withAi.productName).toBe('Apple iPhone 13 128GB')
    expect(withAi.flags.some((f) => f.text.includes('Bateria'))).toBe(true)
  })

  it('ignores an AI product query that has nothing to do with the listing title', () => {
    const tricked = analyzeListing({
      listing: target,
      pool,
      newReferences: newRefs,
      identification: { productName: 'MacBook Pro', productQuery: 'macbook pro m3', condition: 'usado', isAccessory: false, risks: [] },
      settings: DEFAULT_SETTINGS
    })
    expect(tricked.productQuery).toBe('iphone 13 128gb')
  })

  it('acha defeito escrito só na descrição completa do anúncio (sem IA)', () => {
    const withDescription = { ...target, description: 'Console funcionando, mas o controle está com defeito no analógico.' }
    const result = analyzeListing({ listing: withDescription, pool, newReferences: newRefs, identification: null, settings: DEFAULT_SETTINGS })
    expect(result.flags.some((f) => f.level === 'alto' && f.text.includes('defeito'))).toBe(true)
  })

  describe('defeitos lidos pela IA na descrição', () => {
    const base = { productName: 'iPhone 13', productQuery: 'iphone 13 128gb', condition: 'usado' as const, isAccessory: false, risks: [] }
    const run = (extra: object) =>
      analyzeListing({ listing: target, pool, newReferences: newRefs, identification: { ...base, ...extra }, settings: DEFAULT_SETTINGS })

    it('defeito grave vira alerta alto; leve vira médio', () => {
      expect(run({ defects: ['Tela trincada'], defectSeverity: 'grave' }).flags).toContainEqual({ level: 'alto', text: 'Defeito: Tela trincada' })
      expect(run({ defects: ['Risco na traseira'], defectSeverity: 'leve' }).flags).toContainEqual({ level: 'medio', text: 'Defeito: Risco na traseira' })
    })

    it('desconta o conserto estimado do lucro e da nota', () => {
      const clean = run({})
      const broken = run({ defects: ['Bateria 70%'], defectSeverity: 'leve', repairCost: 300 })
      expect(broken.repairCost).toBe(300)
      expect(broken.bestProfit).toBeCloseTo((clean.bestProfit ?? 0) - 300, 0)
      expect(broken.score).toBeLessThan(clean.score)
      expect(broken.flags.some((f) => f.text.includes('conserto') && f.text.includes('R$ 300'))).toBe(true)
    })

    it('conserto vindo da IA é limitado (não confiável): negativo vira 0 e no máximo o preço do anúncio', () => {
      expect(run({ repairCost: -500 }).repairCost).toBe(0)
      expect(run({ repairCost: 999_999 }).repairCost).toBe(target.price)
    })

    it('guarda o veredito da IA, sem links nem contatos (o texto do vendedor pode ter tentado manipular a IA)', () => {
      expect(run({ verdict: 'Compensa se negociar o conserto da bateria.' }).aiVerdict).toBe('Compensa se negociar o conserto da bateria.')
      expect(run({ verdict: 'Compre em https://golpe.com' }).aiVerdict).toBeNull()
      expect(run({ verdict: 'Chame no wa.me/5511999999999' }).aiVerdict).toBeNull()
      expect(run({ verdict: 'Ligue 11 98888-7777 e garanta' }).aiVerdict).toBeNull()
      expect(run({ verdict: 'Veja bit.ly/oferta' }).aiVerdict).toBeNull()
    })
  })

  it('drops AI risks that contain links', () => {
    const result = analyzeListing({
      listing: target,
      pool,
      newReferences: newRefs,
      identification: { productName: 'iPhone 13', productQuery: 'iphone 13 128gb', condition: 'usado', isAccessory: false, risks: ['Veja https://golpe.com', 'Sem nota'] },
      settings: DEFAULT_SETTINGS
    })
    expect(result.flags.some((f) => f.text.includes('golpe.com'))).toBe(false)
    expect(result.flags.some((f) => f.text === 'Sem nota')).toBe(true)
  })

  it('returns zero score and no channels without market reference', () => {
    const lonely = listing('Produto muito raro xyz', 100)
    const result = analyzeListing({ listing: lonely, pool: [lonely], newReferences: [], identification: null, settings: DEFAULT_SETTINGS })
    expect(result.channels).toEqual([])
    expect(result.score).toBe(0)
    expect(result.bestProfit).toBeNull()
  })

  it('shows the typical used price range and liquidity', () => {
    expect(analysis.usedRange).toEqual({ low: 2075, high: 2225 })
    expect(analysis.liquidity).toBe('media')
  })

  it('computes the profit if it only sells at the low end of the range', () => {
    // Facebook sem taxas: 2075 com 12% de desconto (1826) - 1500.
    expect(analysis.worstCaseProfit).toBe(326)
  })

  it('warns when selling at the low end of the market gives no profit', () => {
    const pricey = listing('iPhone 13 128GB verde', 1850)
    const result = analyzeListing({ listing: pricey, pool: [...pool, pricey], newReferences: newRefs, identification: null, settings: DEFAULT_SETTINGS })
    expect(result.bestProfit).toBeGreaterThan(0)
    expect(result.worstCaseProfit).toBeLessThanOrEqual(0)
    expect(result.flags.some((f) => f.level === 'medio' && /menor preço/i.test(f.text))).toBe(true)
  })

  it('applies a realistic default discount for a quick sale', () => {
    expect(DEFAULT_SETTINGS.quickSaleDiscountPct).toBe(12)
  })

  it('flags accessories', () => {
    const accessory = listing('Capinha iPhone 13', 30)
    const result = analyzeListing({ listing: accessory, pool, newReferences: [], identification: null, settings: DEFAULT_SETTINGS })
    expect(result.flags.some((f) => /acessório/i.test(f.text))).toBe(true)
  })
})

describe('preço do usado estimado pela IA', () => {
  const lonely = listing('iPhone 11 64GB', 800)
  const ai = (over: object) => ({ productName: 'iPhone 11 64GB', productQuery: 'iphone 11 64gb', condition: 'usado' as const, isAccessory: false, risks: [], ...over })

  it('sem anúncios iguais na varredura, usa a estimativa da IA como mercado e dá nota', () => {
    const result = analyzeListing({ listing: lonely, pool: [lonely], newReferences: [], identification: ai({ usedMarketPriceBRL: 1300 }), settings: DEFAULT_SETTINGS })
    expect(result.marketUsedPrice).toBe(1300)
    expect(result.marketUsedEstimated).toBe(true)
    expect(result.bestProfit).toBeGreaterThan(0)
    expect(result.score).toBeGreaterThan(0)
  })

  it('havendo comparáveis reais, usa o preço real e não marca como estimado', () => {
    const result = analyzeListing({ listing: target, pool, newReferences: newRefs, identification: ai({ productQuery: 'iphone 13 128gb', usedMarketPriceBRL: 99_999 }), settings: DEFAULT_SETTINGS })
    expect(result.marketUsedPrice).toBe(2150)
    expect(result.marketUsedEstimated).toBe(false)
  })

  it('estimativa zero/ausente não inventa mercado', () => {
    const zero = analyzeListing({ listing: lonely, pool: [lonely], newReferences: [], identification: ai({ usedMarketPriceBRL: 0 }), settings: DEFAULT_SETTINGS })
    expect(zero.marketUsedPrice).toBeNull()
    expect(zero.marketUsedEstimated).toBe(false)
  })
})
