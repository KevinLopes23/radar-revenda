import { describe, expect, it } from 'vitest'
import {
  detectCondition,
  heuristicProductQuery,
  isAccessoryTitle,
  isComparable,
  normalizeText,
  tokenize
} from './text'

describe('normalizeText', () => {
  it('lowercases, strips accents and joins storage units', () => {
    expect(normalizeText('iPhone 13 Mini 128 GB – Câmera')).toBe('iphone 13 mini 128gb camera')
  })

  it('joins terabyte units', () => {
    expect(normalizeText('SSD 1 TB')).toBe('ssd 1tb')
  })
})

describe('tokenize', () => {
  it('removes stopwords and duplicates', () => {
    expect(tokenize('Vendo iPhone 13 de 128gb com caixa iPhone')).toEqual(['iphone', '13', '128gb', 'caixa'])
  })
})

describe('isComparable', () => {
  it('matches same model and storage', () => {
    expect(isComparable('iphone 13 128gb', 'Apple iPhone 13 128GB Azul seminovo')).toBe(true)
  })

  it('rejects different storage', () => {
    expect(isComparable('iphone 13 128gb', 'iPhone 13 256GB')).toBe(false)
  })

  it('rejects extra variant words (pro/max/mini)', () => {
    expect(isComparable('iphone 13 128gb', 'iPhone 13 Pro 128GB')).toBe(false)
    expect(isComparable('iphone 13 128gb', 'iPhone 13 mini 128GB')).toBe(false)
  })

  it('rejects different model numbers', () => {
    expect(isComparable('iphone 13 128gb', 'iPhone 12 128GB')).toBe(false)
  })

  it('accepts any storage when product does not specify it', () => {
    expect(isComparable('playstation 5', 'PlayStation 5 825GB com 2 controles')).toBe(true)
  })

  it('rejects accessories', () => {
    expect(isComparable('iphone 13 128gb', 'Capinha iPhone 13 128gb')).toBe(false)
  })

  it('rejects when main words are missing', () => {
    expect(isComparable('galaxy s23 256gb', 'Moto S23 256GB')).toBe(false)
  })
})

describe('isAccessoryTitle', () => {
  it.each(['Capa para iPhone 13', 'Película de vidro', 'Carregador turbo', 'Caixa vazia iPhone'])(
    'detects accessory: %s',
    (title) => {
      expect(isAccessoryTitle(title)).toBe(true)
    }
  )

  it('does not flag the product itself', () => {
    expect(isAccessoryTitle('iPhone 13 128GB com caixa e carregador')).toBe(false)
  })
})

describe('heuristicProductQuery', () => {
  it('removes sales noise and keeps product words', () => {
    expect(heuristicProductQuery('VENDO iPhone 13 128GB impecável URGENTE!!!')).toBe('iphone 13 128gb')
  })

  it('limits the number of words', () => {
    expect(heuristicProductQuery('Notebook Dell Inspiron 15 i7 16GB SSD 512GB tela full hd').split(' ').length).toBeLessThanOrEqual(7)
  })
})

describe('detectCondition', () => {
  it('detects new items', () => {
    expect(detectCondition('iPhone 13 lacrado na caixa')).toBe('novo')
  })

  it('treats seminovo as used', () => {
    expect(detectCondition('iPhone 13 seminovo')).toBe('usado')
  })

  it('returns unknown when there is no hint', () => {
    expect(detectCondition('iPhone 13 128GB')).toBe('desconhecido')
  })
})
