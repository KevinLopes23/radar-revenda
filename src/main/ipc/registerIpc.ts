/** Registro dos handlers IPC. Toda entrada vinda do renderer é validada aqui. */
import { app, ipcMain, shell } from 'electron'
import { IPC } from '../../shared/ipc'
import { PLATFORMS, isPlatformId, type PlatformId } from '../../shared/platforms'
import type { GeminiTestResult } from '../../shared/types'
import type { AccountsService } from '../accounts/accountsService'
import { belongsToDomain } from '../accounts/loginStatus'
import { GeminiClient } from '../ai/gemini'
import { testClaudeLocal } from '../ai/claudeLocal'
import type { OpportunitiesRepo, PurchasesRepo, SearchesRepo } from '../data/repositories'
import {
  parseId,
  parseIds,
  parseOpportunityStatus,
  parsePurchaseInput,
  parseSaleInput,
  parseSearchInput
} from '../data/validation'
import type { ScanService } from '../scan/scanService'
import type { SettingsService } from '../settings/settingsService'

export interface IpcDeps {
  readonly accounts: AccountsService
  readonly settings: SettingsService
  readonly searches: SearchesRepo
  readonly opportunities: OpportunitiesRepo
  readonly purchases: PurchasesRepo
  readonly scan: ScanService
  readonly onOpportunitiesChanged: () => void
}

function requirePlatformId(value: unknown): PlatformId {
  if (!isPlatformId(value)) throw new Error('Plataforma inválida.')
  return value
}

/** Só abre links https das plataformas suportadas. */
function requireMarketplaceUrl(value: unknown): string {
  if (typeof value !== 'string') throw new Error('Link inválido.')
  const url = new URL(value)
  const allowed = url.protocol === 'https:' && PLATFORMS.some((p) => belongsToDomain(url.hostname, p.cookieDomain))
  if (!allowed) throw new Error('Só é possível abrir links das plataformas suportadas.')
  return url.toString()
}

async function testGemini(settings: SettingsService): Promise<GeminiTestResult> {
  const key = settings.getGeminiKey()
  if (!key) return { ok: false, message: 'Nenhuma chave salva.' }
  try {
    await new GeminiClient(key, settings.get().geminiModel).test()
    return { ok: true, message: `Gemini respondeu (modelo ${settings.get().geminiModel}).` }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

function registerAccounts({ accounts }: IpcDeps): void {
  ipcMain.handle(IPC.accountsList, () => accounts.list())
  ipcMain.handle(IPC.accountsConnect, (_e, id: unknown) => accounts.connect(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsConfirm, (_e, id: unknown) => accounts.confirm(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsDisconnect, (_e, id: unknown) => accounts.disconnect(requirePlatformId(id)))
  ipcMain.handle(IPC.accountsCloseBrowser, () => accounts.closeBrowser())
}

async function testClaude(settings: SettingsService): Promise<GeminiTestResult> {
  const model = settings.get().claudeModel
  try {
    await testClaudeLocal(model)
    return { ok: true, message: `Claude local respondeu (modelo ${model}).` }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : String(error) }
  }
}

function registerSettings({ settings }: IpcDeps): void {
  ipcMain.handle(IPC.settingsGet, () => settings.view())
  ipcMain.handle(IPC.settingsSave, (_e, raw: unknown) => settings.save(raw))
  ipcMain.handle(IPC.settingsSetGeminiKey, (_e, key: unknown) => settings.setGeminiKey(key))
  ipcMain.handle(IPC.settingsClearGeminiKey, () => settings.clearGeminiKey())
  ipcMain.handle(IPC.settingsTestGemini, () => testGemini(settings))
  ipcMain.handle(IPC.settingsTestClaude, () => testClaude(settings))
}

function registerSearchesAndScan({ searches, scan }: IpcDeps): void {
  ipcMain.handle(IPC.searchesList, () => searches.list())
  ipcMain.handle(IPC.searchesCreate, (_e, raw: unknown) => searches.create(parseSearchInput(raw)))
  ipcMain.handle(IPC.searchesUpdate, (_e, id: unknown, raw: unknown) => searches.update(parseId(id), parseSearchInput(raw)))
  ipcMain.handle(IPC.searchesRemove, (_e, id: unknown) => searches.remove(parseId(id)))
  ipcMain.handle(IPC.scanStatus, () => scan.getStatus())
  ipcMain.handle(IPC.scanStart, (_e, id: unknown) => scan.start(id === null ? null : parseId(id)))
  ipcMain.handle(IPC.scanStop, () => scan.stop())
}

function registerOpportunitiesAndPurchases({ opportunities, purchases, onOpportunitiesChanged }: IpcDeps): void {
  ipcMain.handle(IPC.opportunitiesList, () => opportunities.list())
  ipcMain.handle(IPC.opportunitiesSetStatus, (_e, id: unknown, status: unknown) => {
    const result = opportunities.setStatus(parseId(id), parseOpportunityStatus(status))
    onOpportunitiesChanged()
    return result
  })
  ipcMain.handle(IPC.opportunitiesClearDiscarded, () => {
    const result = opportunities.clearDiscarded()
    onOpportunitiesChanged()
    return result
  })
  ipcMain.handle(IPC.opportunitiesRemoveMany, (_e, ids: unknown) => {
    const result = opportunities.removeMany(parseIds(ids))
    onOpportunitiesChanged()
    return result
  })
  ipcMain.handle(IPC.purchasesList, () => purchases.list())
  ipcMain.handle(IPC.purchasesAdd, (_e, raw: unknown) => purchases.add(parsePurchaseInput(raw)))
  ipcMain.handle(IPC.purchasesSell, (_e, id: unknown, raw: unknown) => purchases.sell(parseId(id), parseSaleInput(raw)))
  ipcMain.handle(IPC.purchasesRemove, (_e, id: unknown) => purchases.remove(parseId(id)))
}

export function registerIpc(deps: IpcDeps): void {
  registerAccounts(deps)
  registerSettings(deps)
  registerSearchesAndScan(deps)
  registerOpportunitiesAndPurchases(deps)
  ipcMain.handle(IPC.appVersion, () => app.getVersion())
  ipcMain.handle(IPC.appOpenExternal, (_e, url: unknown) => shell.openExternal(requireMarketplaceUrl(url)))
}
