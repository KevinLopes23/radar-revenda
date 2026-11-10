/** Regras puras para detectar sessões logadas nas plataformas (testáveis sem navegador). */
import type { Platform } from '../../shared/platforms'

export interface CookieLike {
  readonly name: string
  readonly value: string
  readonly domain: string
  /** Segundos Unix; -1 indica cookie de sessão do navegador. */
  readonly expires: number
}

export type SavedStatus = 'conectado' | 'desconectado'

const SESSION_COOKIE_NO_EXPIRY = -1
const FACEBOOK_DOMAIN = 'facebook.com'
const CHECKPOINT_PATH_PATTERN = /^\/(checkpoint|two_step_verification|login)(\/|$)/

/** Indica se `domain` é o domínio da plataforma ou um subdomínio dele. */
export function belongsToDomain(domain: string, platformDomain: string): boolean {
  const host = domain.replace(/^\./, '').toLowerCase()
  return host === platformDomain || host.endsWith(`.${platformDomain}`)
}

function isCookieValid(cookie: CookieLike, nowSeconds: number): boolean {
  if (cookie.value.length === 0) return false
  if (cookie.expires === SESSION_COOKIE_NO_EXPIRY) return true
  return cookie.expires > nowSeconds
}

/** Indica se todos os cookies de sessão exigidos existem, são do domínio certo e estão válidos. */
export function hasSessionCookies(
  cookies: readonly CookieLike[],
  requiredNames: readonly string[],
  platformDomain: string,
  nowSeconds: number
): boolean {
  if (requiredNames.length === 0) return false
  return requiredNames.every((name) =>
    cookies.some(
      (c) => c.name === name && belongsToDomain(c.domain, platformDomain) && isCookieValid(c, nowSeconds)
    )
  )
}

function hasAnyValidCookie(cookies: readonly CookieLike[], platformDomain: string, nowSeconds: number): boolean {
  return cookies.some((c) => belongsToDomain(c.domain, platformDomain) && isCookieValid(c, nowSeconds))
}

/**
 * Status de uma plataforma a partir do perfil salvo.
 * - Com cookies de sessão conhecidos: detecção automática.
 * - Sem eles: vale a confirmação manual, desde que o perfil ainda tenha cookies do site.
 */
export function resolveSavedStatus(
  platform: Platform,
  cookies: readonly CookieLike[],
  confirmedAt: string | undefined,
  nowSeconds: number
): SavedStatus {
  if (!platform.connectable) return 'conectado'
  if (platform.sessionCookies) {
    return hasSessionCookies(cookies, platform.sessionCookies, platform.cookieDomain, nowSeconds)
      ? 'conectado'
      : 'desconectado'
  }
  return confirmedAt && hasAnyValidCookie(cookies, platform.cookieDomain, nowSeconds) ? 'conectado' : 'desconectado'
}

/** Indica se a URL é uma página de login ou verificação de segurança do Facebook (checkpoint/2FA). */
export function isCheckpointUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return belongsToDomain(parsed.hostname, FACEBOOK_DOMAIN) && CHECKPOINT_PATH_PATTERN.test(parsed.pathname)
  } catch {
    return false
  }
}
