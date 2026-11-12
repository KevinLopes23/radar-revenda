import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type RadarApi } from '../shared/ipc'

const invoke =
  <R>(channel: string) =>
  (...args: unknown[]): Promise<R> =>
    ipcRenderer.invoke(channel, ...args) as Promise<R>

function subscribe<T>(channel: string, listener: (value: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, value: T): void => listener(value)
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: RadarApi = {
  accounts: {
    list: invoke(IPC.accountsList),
    connect: invoke(IPC.accountsConnect),
    confirm: invoke(IPC.accountsConfirm),
    disconnect: invoke(IPC.accountsDisconnect),
    closeBrowser: invoke(IPC.accountsCloseBrowser),
    onChange: (listener) => subscribe(IPC.accountsChanged, listener)
  },
  settings: {
    get: invoke(IPC.settingsGet),
    save: invoke(IPC.settingsSave),
    setGeminiKey: invoke(IPC.settingsSetGeminiKey),
    clearGeminiKey: invoke(IPC.settingsClearGeminiKey),
    testGemini: invoke(IPC.settingsTestGemini),
    testClaude: invoke(IPC.settingsTestClaude)
  },
  searches: {
    list: invoke(IPC.searchesList),
    create: invoke(IPC.searchesCreate),
    update: invoke(IPC.searchesUpdate),
    remove: invoke(IPC.searchesRemove)
  },
  scan: {
    status: invoke(IPC.scanStatus),
    start: invoke(IPC.scanStart),
    stop: invoke(IPC.scanStop),
    onStatus: (listener) => subscribe(IPC.scanChanged, listener)
  },
  opportunities: {
    list: invoke(IPC.opportunitiesList),
    setStatus: invoke(IPC.opportunitiesSetStatus),
    clearDiscarded: invoke(IPC.opportunitiesClearDiscarded),
    removeMany: invoke(IPC.opportunitiesRemoveMany),
    onChange: (listener) => subscribe(IPC.opportunitiesChanged, listener)
  },
  purchases: {
    list: invoke(IPC.purchasesList),
    add: invoke(IPC.purchasesAdd),
    sell: invoke(IPC.purchasesSell),
    remove: invoke(IPC.purchasesRemove)
  },
  app: {
    version: invoke(IPC.appVersion),
    openExternal: invoke(IPC.appOpenExternal),
    onNavigate: (listener) => subscribe(IPC.appNavigate, listener)
  }
}

contextBridge.exposeInMainWorld('radar', api)
