/** Contrato IPC compartilhado entre main, preload e renderer. */
import type { PlatformId } from './platforms'

export type AccountStatus =
  | 'verificando'
  | 'desconectado'
  | 'abrindo'
  | 'aguardando-login'
  | 'aguardando-confirmacao'
  | 'conectado'
  | 'erro'

export interface AccountState {
  readonly platformId: PlatformId
  readonly status: AccountStatus
  readonly message: string
  readonly updatedAt: string
}

export interface RadarApi {
  readonly accounts: {
    list(): Promise<readonly AccountState[]>
    /** Abre o Chrome do app na página de login da plataforma. */
    connect(platformId: PlatformId): Promise<readonly AccountState[]>
    /** Confirma manualmente o login (plataformas sem detecção automática). */
    confirm(platformId: PlatformId): Promise<readonly AccountState[]>
    /** Remove a sessão salva da plataforma (apaga os cookies do perfil do app). */
    disconnect(platformId: PlatformId): Promise<readonly AccountState[]>
    /** Fecha a janela do navegador; as sessões continuam salvas. */
    closeBrowser(): Promise<readonly AccountState[]>
    onChange(listener: (states: readonly AccountState[]) => void): () => void
  }
  readonly app: {
    version(): Promise<string>
  }
}

export const IPC = {
  accountsList: 'accounts:list',
  accountsConnect: 'accounts:connect',
  accountsConfirm: 'accounts:confirm',
  accountsDisconnect: 'accounts:disconnect',
  accountsCloseBrowser: 'accounts:close-browser',
  accountsChanged: 'accounts:changed',
  appVersion: 'app:version'
} as const
