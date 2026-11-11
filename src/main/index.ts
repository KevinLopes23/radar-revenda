import { app, BrowserWindow, Notification, session } from 'electron'
import { join } from 'node:path'
import { IPC } from '../shared/ipc'
import type { Opportunity, Purchase, SavedSearch, Settings } from '../shared/types'
import { AccountsService } from './accounts/accountsService'
import { BrowserManager } from './accounts/browser'
import { ConfirmationsStore } from './accounts/confirmationsStore'
import {
  OpportunitiesRepo,
  parsePriceCache,
  PriceCache,
  PurchasesRepo,
  SearchesRepo,
  type PriceCacheData
} from './data/repositories'
import { DEFAULT_SETTINGS, parseOpportunities, parsePurchases, parseSearches, parseStoredSettings } from './data/validation'
import { registerIpc } from './ipc/registerIpc'
import { ScanService } from './scan/scanService'
import { parseSecrets, SettingsService, type Secrets } from './settings/settingsService'
import { JsonFile } from './store/jsonFile'

const WINDOW_SIZE = { width: 1320, height: 860, minWidth: 1000, minHeight: 660 }
const BACKGROUND_COLOR = '#0b0f17'
const MAX_NOTIFICATIONS_PER_ROUND = 3

let mainWindow: BrowserWindow | null = null

const send = (channel: string, value: unknown): void => {
  mainWindow?.webContents.send(channel, value)
}

const dataDir = app.getPath('userData')
const file = <T>(name: string, parse: (raw: unknown) => T, fallback: () => T): JsonFile<T> =>
  new JsonFile(join(dataDir, name), parse, fallback)

const browser = new BrowserManager(join(dataDir, 'browser-profile'), () => accounts.handleBrowserClosed())
const accounts = new AccountsService(browser, new ConfirmationsStore(join(dataDir, 'accounts.json')), (states) =>
  send(IPC.accountsChanged, states)
)
const settings = new SettingsService(
  file<Settings>('settings.json', parseStoredSettings, () => DEFAULT_SETTINGS),
  file<Secrets>('secrets.json', parseSecrets, () => ({})),
  () => scan.reschedule()
)
const searches = new SearchesRepo(file<SavedSearch[]>('searches.json', parseSearches, () => []))
const opportunities = new OpportunitiesRepo(file<Opportunity[]>('opportunities.json', parseOpportunities, () => []))
const purchases = new PurchasesRepo(file<Purchase[]>('purchases.json', parsePurchases, () => []))
const priceCache = new PriceCache(file<PriceCacheData>('price-cache.json', parsePriceCache, () => ({})))

const brl = (value: number): string => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function notifyOpportunities(items: readonly Opportunity[]): void {
  send(IPC.opportunitiesChanged, opportunities.list())
  if (!Notification.isSupported()) return
  const minScore = settings.get().scan.minScoreToNotify
  items
    .filter((o) => o.analysis.score >= minScore)
    .sort((a, b) => b.analysis.score - a.analysis.score)
    .slice(0, MAX_NOTIFICATIONS_PER_ROUND)
    .forEach((o) => {
      const profit = o.analysis.bestProfit === null ? '' : ` · lucro ~${brl(o.analysis.bestProfit)}`
      const notification = new Notification({
        title: `Oportunidade nota ${o.analysis.score.toFixed(1)}`,
        body: `${o.listing.title} por ${brl(o.listing.price)}${profit}`
      })
      notification.on('click', () => {
        mainWindow?.show()
        mainWindow?.focus()
        send(IPC.appNavigate, 'oportunidades')
      })
      notification.show()
    })
}

const scan = new ScanService({
  browser,
  accounts: () => accounts.list(),
  searches,
  opportunities,
  priceCache,
  settings,
  onStatus: (status) => send(IPC.scanChanged, status),
  onNewOpportunities: notifyOpportunities
})

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    show: false,
    title: 'Achadão',
    backgroundColor: BACKGROUND_COLOR,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  window.once('ready-to-show', () => window.show())
  // A janela do app nunca navega para fora nem abre pop-ups; links vão pelo IPC (com allowlist).
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  const devServerUrl = !app.isPackaged ? process.env['ELECTRON_RENDERER_URL'] : undefined
  const devOrigin = devServerUrl ? new URL(devServerUrl).origin : null
  window.webContents.on('will-navigate', (event, url) => {
    const isDevReload = devOrigin !== null && URL.canParse(url) && new URL(url).origin === devOrigin
    if (!isDevReload) event.preventDefault()
  })
  window.webContents.on('will-attach-webview', (event) => event.preventDefault())

  if (devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

app.setAppUserModelId('br.kevma.achadao')

app.whenReady().then(() => {
  // O app não precisa de câmera, microfone, localização, notificações web etc.
  session.defaultSession.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
  session.defaultSession.setPermissionCheckHandler(() => false)
  registerIpc({
    accounts,
    settings,
    searches,
    opportunities,
    purchases,
    scan,
    onOpportunitiesChanged: () => send(IPC.opportunitiesChanged, opportunities.list())
  })
  mainWindow = createWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  void accounts.refresh()
  scan.reschedule()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  accounts.dispose()
  scan.dispose()
  void browser.dispose().finally(() => app.quit())
})
