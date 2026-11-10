import { chromium, type BrowserContext, type Page } from 'playwright-core'
import type { CookieLike } from './loginStatus'

const CHROME_CHANNEL = 'chrome'
const BLANK_PAGE = 'about:blank'

/** Traduz erros do Playwright em mensagens claras para o usuário. */
export function browserErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error)
  if (/executable doesn't exist|distribution 'chrome' is not found|chrome.*not found/i.test(raw)) {
    return 'Google Chrome não encontrado. Instale o Chrome para conectar suas contas.'
  }
  if (/user data directory is already in use|ProcessSingleton/i.test(raw)) {
    return 'O perfil do navegador já está em uso. Feche a janela do Chrome do app e tente de novo.'
  }
  return `Falha no navegador: ${raw}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Dono único do Chrome do app (perfil persistente com as sessões das plataformas).
 * Todas as operações são serializadas: o mesmo perfil nunca é aberto duas vezes.
 */
export class BrowserManager {
  private context: BrowserContext | null = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    private readonly profileDir: string,
    private readonly onClosed: () => void
  ) {}

  isOpen(): boolean {
    return this.context !== null
  }

  /** Abre (ou reaproveita) a janela visível e navega até a URL numa aba. */
  open(url: string): Promise<Page> {
    return this.exclusive(async () => {
      const context = await this.ensureVisibleContext()
      const blank = context.pages().find((p) => p.url() === BLANK_PAGE)
      const page = blank ?? (await context.newPage())
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.bringToFront()
      return page
    })
  }

  /** Lê os cookies do perfil (sem acessar nenhum site quando a janela está fechada). */
  readCookies(): Promise<CookieLike[]> {
    return this.exclusive(() => this.withContext((context) => context.cookies()))
  }

  /** Apaga os cookies de um domínio (e subdomínios), encerrando a sessão daquela plataforma. */
  clearCookies(domain: string): Promise<void> {
    const pattern = new RegExp(`(^|\\.)${escapeRegExp(domain)}$`)
    return this.exclusive(() => this.withContext((context) => context.clearCookies({ domain: pattern })))
  }

  pageUrls(): string[] {
    return this.context?.pages().map((p) => p.url()) ?? []
  }

  close(): Promise<void> {
    return this.exclusive(async () => {
      const context = this.context
      this.context = null
      if (context) await context.close().catch(() => undefined)
    })
  }

  private async ensureVisibleContext(): Promise<BrowserContext> {
    if (this.context) return this.context
    const context = await chromium.launchPersistentContext(this.profileDir, {
      channel: CHROME_CHANNEL,
      headless: false,
      viewport: null
    })
    context.on('close', () => {
      if (this.context !== context) return
      this.context = null
      this.onClosed()
    })
    this.context = context
    return context
  }

  /** Usa a janela aberta; se não houver, abre o perfil em modo invisível só para a operação. */
  private async withContext<T>(task: (context: BrowserContext) => Promise<T>): Promise<T> {
    if (this.context) return task(this.context)
    const headless = await chromium.launchPersistentContext(this.profileDir, {
      channel: CHROME_CHANNEL,
      headless: true
    })
    try {
      return await task(headless)
    } finally {
      await headless.close().catch(() => undefined)
    }
  }

  private exclusive<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task, task)
    this.queue = run.catch(() => undefined)
    return run
  }
}
