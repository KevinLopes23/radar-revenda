/** Descrição completa do anúncio (lida na página do anúncio): onde fica e como limpar. */
import type { PlatformId } from '../../shared/platforms'

export const MAX_DESCRIPTION_LENGTH = 3_000
const MIN_DESCRIPTION_LENGTH = 15

/**
 * Bloco da descrição em cada plataforma (conferido nas páginas reais). Quando nenhum casa,
 * o leitor usa o `og:description`/`description` da página, que quase todas preenchem com o texto do vendedor.
 */
export const DESCRIPTION_SELECTORS: Readonly<Record<PlatformId, readonly string[]>> = {
  olx: ['[data-section="description"]', '.advc-ad-description__lines'],
  enjoei: ['.l-product-details__description'],
  mercadolivre: ['.ui-pdp-description__content', '.ui-pdp-description'],
  facebook: [],
  shopee: ['.product-detail', '[class*="product-description"]'],
  buscape: []
}

const HEADING = /^\s*descri[çc][ãa]o( do (produto|an[úu]ncio))?\s*\n+/i

/** Texto de terceiros: tira HTML, junta espaços e corta o tamanho. `null` quando não há descrição útil. */
export function cleanDescription(raw: string | null | undefined): string | null {
  if (!raw) return null
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/[ \t ]+/g, ' ')
    .replace(/ *\n\s*/g, '\n')
    .trim()
    .replace(HEADING, '')
    .trim()
  return text.length >= MIN_DESCRIPTION_LENGTH ? text.slice(0, MAX_DESCRIPTION_LENGTH) : null
}
