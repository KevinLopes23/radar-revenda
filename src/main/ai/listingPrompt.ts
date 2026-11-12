/** Texto de um anúncio para o prompt da IA, neutralizado contra injeção. Compartilhado entre os motores. */
import type { Listing } from '../../shared/types'

/** Impede que o texto do anúncio feche o delimitador ou injete marcações. */
export const sanitizeForPrompt = (text: string): string => text.replace(/[<>]/g, ' ')

/** Card + descrição completa, sem tags HTML; é onde o vendedor costuma avisar defeitos. */
export function buildListingPrompt(listing: Listing): string {
  const description = listing.description?.replace(/<[^>]*>/g, '').trim() || '(não disponível)'
  return sanitizeForPrompt(
    `Plataforma: ${listing.platformId}\nTítulo: ${listing.title}\nPreço: R$ ${listing.price}\nTexto do card:\n${listing.text}\n` +
      `Descrição completa do anúncio:\n${description}`
  )
}
