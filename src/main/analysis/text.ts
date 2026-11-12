/** Normalização de texto e comparação de títulos de anúncios (funções puras). */
import type { ListingCondition } from '../../shared/types'

const STOPWORDS: ReadonlySet<string> = new Set([
  'de', 'do', 'da', 'dos', 'das', 'com', 'e', 'o', 'a', 'os', 'as', 'para', 'pra', 'em', 'no', 'na', 'um', 'uma',
  'por', 'sem', 'vendo', 'vende', 'venda', 'troco', 'troca', 'urgente', 'novo', 'nova', 'usado', 'usada',
  'seminovo', 'seminova', 'semi', 'lacrado', 'lacrada', 'original', 'top', 'barato', 'impecavel', 'perfeito',
  'perfeita', 'estado', 'otimo', 'otima', 'bom', 'boa', 'oportunidade', 'promocao', 'leia', 'descricao',
  'apenas', 'so', 'somente', 'aceito', 'cartao', 'pix', 'entrego', 'oferta', 'dia', 'zap', 'whatsapp',
  // Cores não mudam o modelo nem (quase) o preço.
  'azul', 'preto', 'preta', 'branco', 'branca', 'rosa', 'vermelho', 'vermelha', 'verde', 'roxo', 'roxa',
  'dourado', 'dourada', 'prata', 'cinza', 'grafite', 'amarelo', 'amarela', 'laranja', 'meia', 'noite',
  'estelar', 'lilas', 'bege', 'marrom', 'gold', 'silver', 'black', 'white', 'blue', 'red', 'green', 'pink',
  'purple', 'midnight', 'starlight', 'gray', 'grey'
])

const VARIANTS: ReadonlySet<string> = new Set([
  'pro', 'max', 'plus', 'mini', 'ultra', 'lite', 'fe', 'se', 'air', 'slim', 'xl', 'digital', 'neo', 'prime', 'note'
])

const ACCESSORY_FIRST_WORDS: ReadonlySet<string> = new Set([
  'capa', 'capinha', 'case', 'pelicula', 'carregador', 'cabo', 'fonte', 'suporte', 'adesivo', 'skin', 'tampa',
  'carcaca', 'display', 'tela', 'bateria', 'kit', 'pulseira', 'protetor', 'placa', 'peca', 'pecas'
])

const ACCESSORY_PHRASES = /\b(caixa vazia|(so|somente|apenas) (a )?caixa)\b/

const MAX_QUERY_WORDS = 7

export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/(\d+)\s*(gb|tb|mb)\b/g, '$1$2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Tokens significativos (sem palavras de venda e sem repetição), na ordem em que aparecem. */
export function tokenize(text: string): string[] {
  const tokens = normalizeText(text)
    .split(' ')
    .filter((t) => t.length > 0 && !STOPWORDS.has(t))
  return [...new Set(tokens)]
}

const isVariant = (token: string): boolean => VARIANTS.has(token)
const isSpec = (token: string): boolean => /\d/.test(token) || isVariant(token)

export function isAccessoryTitle(title: string): boolean {
  const normalized = normalizeText(title)
  const firstWord = normalized.split(' ')[0] ?? ''
  // Também o 1º token significativo: "nova - capa iphone" começa com "nova" (palavra de venda), mas é capa.
  const firstToken = tokenize(title)[0] ?? ''
  return ACCESSORY_FIRST_WORDS.has(firstWord) || ACCESSORY_FIRST_WORDS.has(firstToken) || ACCESSORY_PHRASES.test(normalized)
}

/**
 * Indica se o título de outro anúncio é o mesmo produto: mesmas especificações
 * (números, capacidade, variante) e a maior parte das palavras principais.
 */
export function isComparable(productQuery: string, candidateTitle: string): boolean {
  if (isAccessoryTitle(candidateTitle)) return false
  const product = tokenize(productQuery)
  if (product.length === 0) return false
  const candidate = new Set(tokenize(candidateTitle))

  const specs = product.filter(isSpec)
  if (specs.some((t) => !candidate.has(t))) return false

  const productVariants = new Set(product.filter(isVariant))
  if ([...candidate].some((t) => isVariant(t) && !productVariants.has(t))) return false

  const words = product.filter((t) => !isSpec(t))
  if (words.length === 0) return true
  const present = words.filter((t) => candidate.has(t)).length
  return present / words.length >= 0.6
}

/** Consulta de busca do produto sem IA: o título limpo, curto e sem "palavras de venda". */
export function heuristicProductQuery(title: string): string {
  return tokenize(title).slice(0, MAX_QUERY_WORDS).join(' ')
}

const USED_PATTERN = /\b(semi ?novo|semi ?nova|usad[oa]|marcas de uso|com uso|como novo|estado de novo|igual novo|tipo novo)\b/
// Só sinais fortes: "bateria nova" ou "tela nova" não fazem o produto ser novo.
const NEW_PATTERN = /\b(lacrad[oa]|nunca usad[oa]|nov[oa] na caixa|sem uso|nov[oa] lacrad[oa])\b/

export function detectCondition(text: string): ListingCondition {
  const normalized = normalizeText(text)
  if (USED_PATTERN.test(normalized)) return 'usado'
  if (NEW_PATTERN.test(normalized)) return 'novo'
  return 'desconhecido'
}
