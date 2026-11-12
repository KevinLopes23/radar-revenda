import { describe, expect, it } from 'vitest'
import { getPlatform } from './platforms'

describe('platforms', () => {
  it('o login do Mercado Livre aponta para a página real (/login dá "página no existe")', () => {
    const url = new URL(getPlatform('mercadolivre').loginUrl)
    expect(url.pathname).toBe('/jms/mlb/lgz/login')
    // Depois do login o site volta para o .com.br, onde ficam os cookies que o app confere.
    expect(url.searchParams.get('go')).toBe('https://www.mercadolivre.com.br/')
  })
})
