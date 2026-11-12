import { describe, expect, it } from 'vitest'
import { cleanDescription, DESCRIPTION_SELECTORS, MAX_DESCRIPTION_LENGTH } from './description'

describe('cleanDescription', () => {
  it('tira <br>, tags e espaços repetidos (og:description da OLX vem com <br>)', () => {
    expect(cleanDescription('Playstation 4 Fat 1TB<br>Novinho   Completo <br/>Funcionando <b>tudo</b>')).toBe(
      'Playstation 4 Fat 1TB\nNovinho Completo\nFuncionando tudo'
    )
  })

  it('remove o título "descrição do produto" que vem junto no Enjoei', () => {
    expect(cleanDescription('descrição do produto\n\nconsole ps4 com controle com defeito na placa')).toBe(
      'console ps4 com controle com defeito na placa'
    )
  })

  it('texto curto demais ou vazio não conta como descrição', () => {
    expect(cleanDescription(null)).toBeNull()
    expect(cleanDescription('   ')).toBeNull()
    expect(cleanDescription('ok')).toBeNull()
  })

  it('limita o tamanho', () => {
    expect(cleanDescription(`ps4 ${'a'.repeat(10_000)}`)?.length).toBe(MAX_DESCRIPTION_LENGTH)
  })
})

describe('DESCRIPTION_SELECTORS', () => {
  it('conhece o bloco de descrição das plataformas de busca', () => {
    expect(DESCRIPTION_SELECTORS.olx).toContain('[data-section="description"]')
    expect(DESCRIPTION_SELECTORS.enjoei).toContain('.l-product-details__description')
    expect(DESCRIPTION_SELECTORS.mercadolivre).toContain('.ui-pdp-description__content')
  })
})
