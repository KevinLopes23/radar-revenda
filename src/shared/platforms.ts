/** Catálogo das plataformas suportadas pelo Achadão. */

export type PlatformId = 'facebook' | 'mercadolivre' | 'olx' | 'enjoei' | 'shopee' | 'buscape'

export interface PlatformRoles {
  /** Varremos anúncios desta plataforma em busca de ofertas para comprar. */
  readonly buscaOfertas: boolean
  /** Usamos os preços desta plataforma como referência de mercado. */
  readonly precoReferencia: boolean
  /** Você pode revender nesta plataforma (entra no cálculo de lucro por canal). */
  readonly revenda: boolean
}

export interface Platform {
  readonly id: PlatformId
  readonly name: string
  readonly color: string
  readonly homeUrl: string
  readonly loginUrl: string
  readonly cookieDomain: string
  /**
   * Cookies que indicam sessão logada. Quando ausente, a conexão é confirmada
   * manualmente pelo usuário ("Já entrei").
   */
  readonly sessionCookies?: readonly string[]
  readonly roles: PlatformRoles
  /** Sem login a varredura não funciona (ex.: Marketplace). */
  readonly loginRequired: boolean
  /** Exibe o botão de conectar conta (fontes só de referência não precisam). */
  readonly connectable: boolean
  readonly hint: string
  /** Estado assumido quando o anúncio não diz se é novo ou usado. */
  readonly defaultCondition: 'novo' | 'usado'
}

export const PLATFORMS: readonly Platform[] = [
  {
    id: 'facebook',
    name: 'Facebook Marketplace',
    color: '#1877f2',
    homeUrl: 'https://www.facebook.com/marketplace/',
    loginUrl: 'https://www.facebook.com/marketplace/',
    cookieDomain: 'facebook.com',
    sessionCookies: ['c_user', 'xs'],
    roles: { buscaOfertas: true, precoReferencia: true, revenda: true },
    loginRequired: true,
    connectable: true,
    hint: 'Obrigatório: o Marketplace só mostra anúncios para quem está logado.',
    defaultCondition: 'usado'
  },
  {
    id: 'mercadolivre',
    name: 'Mercado Livre',
    color: '#ffe600',
    homeUrl: 'https://www.mercadolivre.com.br/',
    // "/login" no .com.br dá "página no existe"; o login fica no .com e volta (go=) para o .com.br.
    loginUrl: 'https://www.mercadolivre.com/jms/mlb/lgz/login?platform_id=ML&go=https%3A%2F%2Fwww.mercadolivre.com.br%2F',
    cookieDomain: 'mercadolivre.com.br',
    roles: { buscaOfertas: true, precoReferencia: true, revenda: true },
    loginRequired: false,
    connectable: true,
    hint: 'Opcional: a busca costuma funcionar sem login; se o site pedir verificação, conecte a conta.',
    defaultCondition: 'novo'
  },
  {
    id: 'olx',
    name: 'OLX',
    color: '#6e0ad6',
    homeUrl: 'https://www.olx.com.br/',
    loginUrl: 'https://conta.olx.com.br/acesso',
    cookieDomain: 'olx.com.br',
    roles: { buscaOfertas: true, precoReferencia: true, revenda: true },
    loginRequired: false,
    connectable: true,
    hint: 'Opcional: a busca funciona sem login; logado você vê o contato do vendedor.',
    defaultCondition: 'usado'
  },
  {
    id: 'enjoei',
    name: 'Enjoei',
    color: '#f05a7e',
    homeUrl: 'https://www.enjoei.com.br/',
    loginUrl: 'https://www.enjoei.com.br/login',
    cookieDomain: 'enjoei.com.br',
    roles: { buscaOfertas: true, precoReferencia: true, revenda: true },
    loginRequired: false,
    connectable: true,
    hint: 'Opcional: forte em eletrônicos usados, moda e itens de marca.',
    defaultCondition: 'usado'
  },
  {
    id: 'shopee',
    name: 'Shopee',
    color: '#ee4d2d',
    homeUrl: 'https://shopee.com.br/',
    loginUrl: 'https://shopee.com.br/buyer/login',
    cookieDomain: 'shopee.com.br',
    roles: { buscaOfertas: true, precoReferencia: true, revenda: true },
    loginRequired: false,
    connectable: true,
    hint: 'Opcional, mas a Shopee só mostra a busca para quem está logado. Bom para preço de novo.',
    defaultCondition: 'novo'
  },
  {
    id: 'buscape',
    name: 'Buscapé',
    color: '#00a650',
    homeUrl: 'https://www.buscape.com.br/',
    loginUrl: 'https://www.buscape.com.br/',
    cookieDomain: 'buscape.com.br',
    roles: { buscaOfertas: false, precoReferencia: true, revenda: false },
    loginRequired: false,
    connectable: false,
    hint: 'Comparador de lojas: referência de preço do produto novo em toda varredura. Não precisa de conta.',
    defaultCondition: 'novo'
  }
]

const PLATFORM_IDS: ReadonlySet<string> = new Set(PLATFORMS.map((p) => p.id))

export function isPlatformId(value: unknown): value is PlatformId {
  return typeof value === 'string' && PLATFORM_IDS.has(value)
}

export function getPlatform(id: PlatformId): Platform {
  const platform = PLATFORMS.find((p) => p.id === id)
  if (!platform) throw new Error(`Plataforma desconhecida: ${id}`)
  return platform
}
