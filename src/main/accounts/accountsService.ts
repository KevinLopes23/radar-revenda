import type { AccountState, AccountStatus } from '../../shared/ipc'
import { getPlatform, PLATFORMS, type Platform, type PlatformId } from '../../shared/platforms'
import { browserErrorMessage, type BrowserManager } from './browser'
import type { ConfirmationsStore } from './confirmationsStore'
import { hasSessionCookies, isCheckpointUrl, resolveSavedStatus, type SavedStatus } from './loginStatus'

const LOGIN_POLL_INTERVAL_MS = 2_000
const LOGIN_TIMEOUT_MS = 10 * 60_000
const IN_PROGRESS: ReadonlySet<AccountStatus> = new Set(['abrindo', 'aguardando-login', 'aguardando-confirmacao'])

type ChangeListener = (states: readonly AccountState[]) => void

/** Acompanhamento de um login em andamento (um por plataforma). */
interface LoginPolling {
  readonly timer: NodeJS.Timeout
  readonly deadline: number
  /** Evita acumular verificações enquanto a anterior ainda espera o navegador. */
  inFlight: boolean
}

const nowSeconds = (): number => Date.now() / 1000

function savedMessage(platform: Platform, status: SavedStatus): string {
  if (!platform.connectable) return 'Fonte pública: não precisa de conta.'
  if (status === 'conectado') return 'Conta conectada.'
  return platform.loginRequired ? 'Conecte para ativar a varredura desta plataforma.' : 'Não conectado (opcional).'
}

/** Mantém o estado das contas conectadas em cada plataforma. */
export class AccountsService {
  private states: ReadonlyMap<PlatformId, AccountState>
  private readonly pollings = new Map<PlatformId, LoginPolling>()

  constructor(
    private readonly browser: BrowserManager,
    private readonly store: ConfirmationsStore,
    private readonly onChange: ChangeListener
  ) {
    const initial = PLATFORMS.map((p) => this.buildState(p.id, 'verificando', 'Verificando sessão salva...'))
    this.states = new Map(initial.map((s) => [s.platformId, s]))
  }

  list(): readonly AccountState[] {
    return PLATFORMS.map((p) => this.states.get(p.id) ?? this.buildState(p.id, 'verificando', ''))
  }

  /** Recalcula o status das plataformas a partir do perfil salvo (logins em andamento não são tocados). */
  async refresh(): Promise<readonly AccountState[]> {
    const idle = (): Platform[] => PLATFORMS.filter((p) => !IN_PROGRESS.has(this.statusOf(p.id)))
    try {
      const cookies = await this.browser.readCookies()
      const confirmations = this.store.load()
      const updates = idle().map((p) => {
        const status = resolveSavedStatus(p, cookies, confirmations[p.id], nowSeconds())
        return this.buildState(p.id, status, savedMessage(p, status))
      })
      return this.apply(updates)
    } catch (error) {
      const message = browserErrorMessage(error)
      return this.apply(idle().filter((p) => p.connectable).map((p) => this.buildState(p.id, 'erro', message)))
    }
  }

  async connect(platformId: PlatformId): Promise<readonly AccountState[]> {
    const platform = getPlatform(platformId)
    if (!platform.connectable) return this.list()
    this.set(platformId, 'abrindo', 'Abrindo o Chrome...')
    try {
      await this.browser.open(platform.loginUrl)
    } catch (error) {
      return this.set(platformId, 'erro', browserErrorMessage(error))
    }
    if (platform.sessionCookies) {
      this.startPolling(platformId)
      return this.set(platformId, 'aguardando-login', 'Faça login (e a verificação, se pedida) na janela do Chrome.')
    }
    return this.set(platformId, 'aguardando-confirmacao', 'Faça login na janela do Chrome e depois clique em "Já entrei".')
  }

  /** Confirmação manual para plataformas sem detecção automática de login. */
  async confirm(platformId: PlatformId): Promise<readonly AccountState[]> {
    const platform = getPlatform(platformId)
    if (!platform.connectable || platform.sessionCookies) return this.list()
    try {
      const cookies = await this.browser.readCookies()
      const confirmedAt = new Date().toISOString()
      if (resolveSavedStatus(platform, cookies, confirmedAt, nowSeconds()) !== 'conectado') {
        return this.set(platformId, 'aguardando-confirmacao', 'Ainda não encontramos o login. Entre na conta e tente de novo.')
      }
      this.store.save({ ...this.store.load(), [platformId]: confirmedAt })
      return this.set(platformId, 'conectado', savedMessage(platform, 'conectado'))
    } catch (error) {
      return this.set(platformId, 'erro', browserErrorMessage(error))
    }
  }

  async disconnect(platformId: PlatformId): Promise<readonly AccountState[]> {
    const platform = getPlatform(platformId)
    if (!platform.connectable) return this.list()
    this.stopPolling(platformId)
    try {
      await this.browser.clearCookies(platform.cookieDomain)
      const { [platformId]: _removed, ...rest } = this.store.load()
      this.store.save(rest)
      return this.set(platformId, 'desconectado', 'Conta desconectada e sessão apagada deste computador.')
    } catch (error) {
      return this.set(platformId, 'erro', browserErrorMessage(error))
    }
  }

  async closeBrowser(): Promise<readonly AccountState[]> {
    this.stopAllPolling()
    await this.browser.close()
    return this.resetInProgressAndRefresh()
  }

  /** Chamado quando a janela do Chrome é fechada (pelo usuário ou ao fim de uma varredura). */
  handleBrowserClosed(): void {
    this.stopAllPolling()
    void this.resetInProgressAndRefresh()
  }

  dispose(): void {
    this.stopAllPolling()
  }

  private async resetInProgressAndRefresh(): Promise<readonly AccountState[]> {
    const pending = PLATFORMS.filter((p) => IN_PROGRESS.has(this.statusOf(p.id)))
    this.apply(pending.map((p) => this.buildState(p.id, 'verificando', 'Verificando sessão salva...')))
    return this.refresh()
  }

  private startPolling(platformId: PlatformId): void {
    this.stopPolling(platformId)
    const timer = setInterval(() => void this.pollLogin(platformId), LOGIN_POLL_INTERVAL_MS)
    this.pollings.set(platformId, { timer, deadline: Date.now() + LOGIN_TIMEOUT_MS, inFlight: false })
  }

  private stopPolling(platformId: PlatformId): void {
    const polling = this.pollings.get(platformId)
    if (polling) clearInterval(polling.timer)
    this.pollings.delete(platformId)
  }

  private stopAllPolling(): void {
    ;[...this.pollings.keys()].forEach((id) => this.stopPolling(id))
  }

  private async pollLogin(platformId: PlatformId): Promise<void> {
    const platform = getPlatform(platformId)
    const polling = this.pollings.get(platformId)
    if (!polling || polling.inFlight || !platform.sessionCookies) return
    polling.inFlight = true
    try {
      const cookies = await this.browser.readCookies()
      // O login pode ter sido cancelado/reiniciado enquanto esperávamos o navegador.
      if (this.pollings.get(platformId) !== polling) return
      const loggedIn = hasSessionCookies(cookies, platform.sessionCookies, platform.cookieDomain, nowSeconds())
      const inCheckpoint = platformId === 'facebook' && this.browser.pageUrls().some(isCheckpointUrl)
      if (loggedIn && !inCheckpoint) {
        this.stopPolling(platformId)
        this.set(platformId, 'conectado', 'Conta conectada. Pode fechar ou deixar o navegador aberto.')
      } else if (Date.now() > polling.deadline) {
        this.stopPolling(platformId)
        this.set(platformId, 'erro', 'Tempo de login esgotado. Clique em "Conectar" para tentar de novo.')
      }
    } catch (error) {
      if (this.pollings.get(platformId) !== polling) return
      this.stopPolling(platformId)
      this.set(platformId, 'erro', browserErrorMessage(error))
    } finally {
      polling.inFlight = false
    }
  }

  private statusOf(platformId: PlatformId): AccountStatus {
    return this.states.get(platformId)?.status ?? 'verificando'
  }

  private buildState(platformId: PlatformId, status: AccountStatus, message: string): AccountState {
    return { platformId, status, message, updatedAt: new Date().toISOString() }
  }

  private set(platformId: PlatformId, status: AccountStatus, message: string): readonly AccountState[] {
    return this.apply([this.buildState(platformId, status, message)])
  }

  private apply(updates: readonly AccountState[]): readonly AccountState[] {
    const next = new Map(this.states)
    updates.forEach((u) => next.set(u.platformId, u))
    this.states = next
    const list = this.list()
    this.onChange(list)
    return list
  }
}
