/** Lê os cards de anúncio de uma página de busca, de forma genérica e com ritmo humano. */
import type { Page } from 'playwright-core'
import { z } from 'zod'
import type { PlatformId } from '../../shared/platforms'
import type { Listing } from '../../shared/types'
import { cleanDescription, DESCRIPTION_SELECTORS, MAX_DESCRIPTION_LENGTH } from './description'
import { parseCard, type RawCard } from './extract'
import { detectBlock, isTrustedItemUrl, itemUrlPattern } from './sources'

const NAVIGATION_TIMEOUT_MS = 45_000
const SCROLL_ROUNDS = 3
const SCROLL_PIXELS = 1400

export class BlockedError extends Error {}

export const pause = (minMs: number, maxMs: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, minMs + Math.random() * (maxMs - minMs)))

/**
 * Executado dentro da página (string pura, sem dependências do bundle): para cada link de anúncio,
 * sobe até o maior "card" que contém um preço e um único anúncio.
 */
const COLLECT_CARDS = `(args) => {
  const re = new RegExp(args.pattern);
  const keyOf = (href) => href.split('?')[0].split('#')[0];
  const seen = new Set();
  const cards = [];
  for (const anchor of document.querySelectorAll('a[href]')) {
    if (!re.test(anchor.href)) continue;
    const key = keyOf(anchor.href);
    if (seen.has(key)) continue;
    let el = anchor;
    let card = null;
    for (let depth = 0; depth < 8 && el && el !== document.body; depth++) {
      const text = el.innerText || '';
      if (text.includes('R$')) {
        const links = new Set();
        for (const a of el.querySelectorAll('a[href]')) if (re.test(a.href)) links.add(keyOf(a.href));
        if (links.size > 1) break;
        card = el;
      }
      el = el.parentElement;
    }
    if (!card) continue;
    seen.add(key);
    const img = card.querySelector('img');
    cards.push({ url: anchor.href, text: (card.innerText || '').slice(0, 1500), image: img ? (img.currentSrc || img.src || null) : null });
    if (cards.length >= args.max) break;
  }
  return cards;
}`

const MAX_CARDS = 200
const rawCardSchema = z.object({
  url: z.string().max(2048),
  text: z.string().max(2000),
  image: z.string().max(4096).nullable()
})

/** O resultado vem de uma página de terceiros: valida formato, tamanho e domínio de cada card. */
function validCards(raw: unknown, platformId: PlatformId): RawCard[] {
  if (!Array.isArray(raw)) return []
  return raw.slice(0, MAX_CARDS).flatMap((item) => {
    const parsed = rawCardSchema.safeParse(item)
    if (!parsed.success || !isTrustedItemUrl(platformId, parsed.data.url)) return []
    const image = parsed.data.image?.startsWith('https://') ? parsed.data.image : null
    return [{ ...parsed.data, image }]
  })
}

async function assertNotBlocked(page: Page): Promise<void> {
  const reason = detectBlock(page.url(), await page.title().catch(() => ''))
  if (reason) throw new BlockedError(reason)
}

/** Executado na página do anúncio: texto do primeiro seletor que existir, senão a descrição das meta tags. */
const COLLECT_DESCRIPTION = `(selectors) => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    const text = el ? (el.innerText || '').trim() : '';
    if (text) return text;
  }
  const meta = document.querySelector('meta[property="og:description"]') || document.querySelector('meta[name="description"]');
  return meta ? meta.getAttribute('content') : null;
}`

/** Abre a página do anúncio e lê a descrição completa do vendedor; `null` se não achar. */
export async function readDescription(page: Page, listing: Pick<Listing, 'platformId' | 'url'>): Promise<string | null> {
  await page.goto(listing.url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await pause(2_500, 4_000)
  await assertNotBlocked(page)
  const raw: unknown = await page.evaluate(`(${COLLECT_DESCRIPTION})(${JSON.stringify(DESCRIPTION_SELECTORS[listing.platformId])})`)
  return typeof raw === 'string' ? cleanDescription(raw.slice(0, MAX_DESCRIPTION_LENGTH * 2)) : null
}

export interface ScrapeOptions {
  readonly platformId: PlatformId
  readonly url: string
  readonly query: string
  readonly max: number
}

export async function scrapeSearchPage(page: Page, options: ScrapeOptions): Promise<Listing[]> {
  await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS })
  await pause(3_000, 5_000)
  await assertNotBlocked(page)

  for (let round = 0; round < SCROLL_ROUNDS; round++) {
    await page.mouse.wheel(0, SCROLL_PIXELS)
    await pause(1_200, 2_500)
  }
  await assertNotBlocked(page)

  const raw: unknown = await page.evaluate(
    `(${COLLECT_CARDS})(${JSON.stringify({ pattern: itemUrlPattern(options.platformId), max: options.max * 2 })})`
  )
  const seen = new Set<string>()
  return validCards(raw, options.platformId)
    .map((card) => parseCard(card, options.platformId, options.query))
    .filter((l): l is Listing => l !== null && !seen.has(l.id) && Boolean(seen.add(l.id)))
    .slice(0, options.max)
}
