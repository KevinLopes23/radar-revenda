import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { join } from 'node:path'
import { IPC, type AccountState } from '../shared/ipc'
import { isPlatformId, type PlatformId } from '../shared/platforms'
import { AccountsService } from './accounts/accountsService'
import { BrowserManager } from './accounts/browser'
import { ConfirmationsStore } from './accounts/confirmationsStore'

const WINDOW_SIZE = { width: 1280, height: 820, minWidth: 980, minHeight: 640 }
const BACKGROUND_COLOR = '#0b0f17'

let mainWindow: BrowserWindow | null = null

function broadcastAccounts(states: readonly AccountState[]): void {
  mainWindow?.webContents.send(IPC.accountsChanged, states)
}

const userData = app.getPath('userData')
const browser = new BrowserManager(join(userData, 'browser-profile'), () => accounts.handleBrowserClosed())
const accounts = new AccountsService(browser, new ConfirmationsStore(join(userData, 'accounts.json')), broadcastAccounts)

function createWindow(): BrowserWindow {
  const window = new BrowserWindow({
    ...WINDOW_SIZE,
    show: false,
    title: 'Radar Revenda',
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

  // Links externos abrem no navegador padrão, nunca dentro do app.
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://')) void shell.openExternal(url)
    return { action: 'deny' }
  })

  const devServerUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devServerUrl) {
    void window.loadURL(devServerUrl)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

/** Valida o id vindo do renderer antes de usá-lo (fronteira de confiança do IPC). */
function requirePlatformId(value: unknown): PlatformId {
  if (!isPlatformId(value)) throw new Error('Plataforma inválida.')
  return value
}

function registerIpcHandlers(): void {
  ipcMain.handle(IPC.accountsList, () => accounts.list())
  ipcMain.handle(IPC.accountsConnect, (_e, id: unknown) => accounts.connect(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsConfirm, (_e, id: unknown) => accounts.confirm(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsDisconnect, (_e, id: unknown) => accounts.disconnect(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsCloseBrowser, () => accounts.closeBrowser())
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
}

app.whenReady().then(() => {
  registerIpcHandlers()
  mainWindow = createWindow()
  mainWindow.on('closed', () => {
    mainWindow = null
  })
  void accounts.refresh()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow()
  })
})

app.on('window-all-closed', () => {
  accounts.dispose()
  void browser.close().finally(() => app.quit())
})
