/** Contrato IPC compartilhado entre main, preload e renderer. */
import type { PlatformId } from './platforms'
import type {
  GeminiTestResult,
  Opportunity,
  OpportunityStatus,
  Purchase,
  PurchaseInput,
  SaleInput,
  SavedSearch,
  ScanStatus,
  SearchInput,
  Settings,
  SettingsView
} from './types'

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

type Listener<T> = (value: T) => void
type Unsubscribe = () => void

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
    onChange(listener: Listener<readonly AccountState[]>): Unsubscribe
  }
  readonly settings: {
    get(): Promise<SettingsView>
    save(settings: Settings): Promise<SettingsView>
    setGeminiKey(key: string): Promise<SettingsView>
    clearGeminiKey(): Promise<SettingsView>
    testGemini(): Promise<GeminiTestResult>
    /** Testa o Claude local (CLI do Claude Code deste PC) com o modelo configurado. */
    testClaude(): Promise<GeminiTestResult>
  }
  readonly searches: {
    list(): Promise<readonly SavedSearch[]>
    create(input: SearchInput): Promise<readonly SavedSearch[]>
    update(id: string, input: SearchInput): Promise<readonly SavedSearch[]>
    remove(id: string): Promise<readonly SavedSearch[]>
  }
  readonly scan: {
    status(): Promise<ScanStatus>
    /** `null` = todas as buscas ativas. */
    start(searchId: string | null): Promise<ScanStatus>
    stop(): Promise<ScanStatus>
    onStatus(listener: Listener<ScanStatus>): Unsubscribe
  }
  readonly opportunities: {
    list(): Promise<readonly Opportunity[]>
    setStatus(id: string, status: OpportunityStatus): Promise<readonly Opportunity[]>
    clearDiscarded(): Promise<readonly Opportunity[]>
    /** Remove as oportunidades escolhidas (uma, várias ou todas). */
    removeMany(ids: readonly string[]): Promise<readonly Opportunity[]>
    onChange(listener: Listener<readonly Opportunity[]>): Unsubscribe
  }
  readonly purchases: {
    list(): Promise<readonly Purchase[]>
    add(input: PurchaseInput): Promise<readonly Purchase[]>
    sell(id: string, sale: SaleInput): Promise<readonly Purchase[]>
    remove(id: string): Promise<readonly Purchase[]>
  }
  readonly app: {
    version(): Promise<string>
    /** Abre um link de anúncio no navegador padrão (só domínios das plataformas). */
    openExternal(url: string): Promise<void>
    onNavigate(listener: Listener<string>): Unsubscribe
  }
}

export const IPC = {
  accountsList: 'accounts:list',
  accountsConnect: 'accounts:connect',
  accountsConfirm: 'accounts:confirm',
  accountsDisconnect: 'accounts:disconnect',
  accountsCloseBrowser: 'accounts:close-browser',
  accountsChanged: 'accounts:changed',
  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsSetGeminiKey: 'settings:set-gemini-key',
  settingsClearGeminiKey: 'settings:clear-gemini-key',
  settingsTestGemini: 'settings:test-gemini',
  settingsTestClaude: 'settings:test-claude',
  searchesList: 'searches:list',
  searchesCreate: 'searches:create',
  searchesUpdate: 'searches:update',
  searchesRemove: 'searches:remove',
  scanStatus: 'scan:status',
  scanStart: 'scan:start',
  scanStop: 'scan:stop',
  scanChanged: 'scan:changed',
  opportunitiesList: 'opportunities:list',
  opportunitiesSetStatus: 'opportunities:set-status',
  opportunitiesClearDiscarded: 'opportunities:clear-discarded',
  opportunitiesRemoveMany: 'opportunities:remove-many',
  opportunitiesChanged: 'opportunities:changed',
  purchasesList: 'purchases:list',
  purchasesAdd: 'purchases:add',
  purchasesSell: 'purchases:sell',
  purchasesRemove: 'purchases:remove',
  appVersion: 'app:version',
  appOpenExternal: 'app:open-external',
  appNavigate: 'app:navigate'
} as const
