import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC, type AccountState, type RadarApi } from '../shared/ipc'

const api: RadarApi = {
  accounts: {
    list: () => ipcRenderer.invoke(IPC.accountsList),
    connect: (platformId) => ipcRenderer.invoke(IPC.accountsConnect, platformId),
    confirm: (platformId) => ipcRenderer.invoke(IPC.accountsConfirm, platformId),
    disconnect: (platformId) => ipcRenderer.invoke(IPC.accountsDisconnect, platformId),
    closeBrowser: () => ipcRenderer.invoke(IPC.accountsCloseBrowser),
    onChange: (listener) => {
      const handler = (_event: IpcRendererEvent, states: readonly AccountState[]): void => listener(states)
      ipcRenderer.on(IPC.accountsChanged, handler)
      return () => ipcRenderer.removeListener(IPC.accountsChanged, handler)
    }
  },
  app: {
    version: () => ipcRenderer.invoke(IPC.appVersion)
  }
}

contextBridge.exposeInMainWorld('radar', api)
