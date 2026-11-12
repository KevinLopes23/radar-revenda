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

interface LaunchMode {
  readonly headless: boolean
  readonly minimized?: boolean
}

/**
 * Opções do Chrome do app. Sem `--enable-automation` e com `AutomationControlled` desligado,
 * `navigator.webdriver` fica falso: senão o Google recusa o login ("navegador pode não ser seguro")
 * e a Meta pede desafio antirrobô sem parar.
 */
export function chromeLaunchOptions({ headless, minimized = false }: LaunchMode) {
  const args = ['--disable-blink-features=AutomationControlled', ...(minimized ? ['--start-minimized'] : [])]
  // chromiumSandbox: true impede o --no-sandbox que o Playwright põe por padrão. Esse flag aparece na janela
  // ("linha de comando não suportada") e é um dos sinais que a Cloudflare (OLX) usa para barrar o navegador.
  const common = { channel: CHROME_CHANNEL, headless, acceptDownloads: false, chromiumSandbox: true, ignoreDefaultArgs: ['--enable-automation'], args }
  return headless ? common : { ...common, viewport: null, locale: 'pt-BR' }
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
  /** A janela foi aberta (ou trazida à frente) pelo usuário para fazer login. */
  private openedByUser = false

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
      this.openedByUser = true
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

  /**
   * Executa uma tarefa numa aba nova do Chrome do app (usado pela varredura).
   * Se o Chrome estiver fechado, ele abre minimizado para não atrapalhar.
   */
  withPage<T>(task: (page: Page) => Promise<T>): Promise<T> {
    return this.exclusive(async () => {
      const context = await this.ensureVisibleContext(true)
      const page = await context.newPage()
      try {
        return await task(page)
      } finally {
        await page.close().catch(() => undefined)
      }
    })
  }

  pageUrls(): string[] {
    return this.context?.pages().map((p) => p.url()) ?? []
  }

  /** Fecha a janela (a pedido do usuário). */
  close(): Promise<void> {
    return this.exclusive(() => this.closeContext(false))
  }

  /** Fecha a janela só se ela foi aberta apenas para a varredura (nunca a janela de login do usuário). */
  releaseAfterScan(): Promise<void> {
    return this.exclusive(async () => {
      if (!this.openedByUser) await this.closeContext(true)
    })
  }

  /** Encerramento do app: fecha na hora, sem esperar a fila de operações. */
  async dispose(): Promise<void> {
    const context = this.context
    this.context = null
    if (context) await context.close().catch(() => undefined)
  }

  private async closeContext(notify: boolean): Promise<void> {
    const context = this.context
    this.context = null
    this.openedByUser = false
    if (!context) return
    await context.close().catch(() => undefined)
    if (notify) this.onClosed()
  }

  private async ensureVisibleContext(minimized = false): Promise<BrowserContext> {
    if (this.context) return this.context
    const context = await chromium.launchPersistentContext(this.profileDir, chromeLaunchOptions({ headless: false, minimized }))
    context.on('close', () => {
      if (this.context !== context) return
      this.context = null
      this.openedByUser = false
      this.onClosed()
    })
    this.context = context
    return context
  }

  /** Usa a janela aberta; se não houver, abre o perfil em modo invisível só para a operação. */
  private async withContext<T>(task: (context: BrowserContext) => Promise<T>): Promise<T> {
    if (this.context) return task(this.context)
    const headless = await chromium.launchPersistentContext(this.profileDir, chromeLaunchOptions({ headless: true }))
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
