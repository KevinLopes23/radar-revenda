import { useCallback, useEffect, useState } from 'react'
import type { AccountState } from '../../../shared/ipc'
import type { PlatformId } from '../../../shared/platforms'

type AccountAction = 'connect' | 'confirm' | 'disconnect'

export interface UseAccounts {
  readonly accounts: readonly AccountState[]
  readonly busy: ReadonlySet<PlatformId>
  readonly error: string | null
  run(action: AccountAction, platformId: PlatformId): Promise<void>
  closeBrowser(): Promise<void>
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado.'
}

/** Estado das contas conectadas, sincronizado com o processo principal. */
export function useAccounts(): UseAccounts {
  const [accounts, setAccounts] = useState<readonly AccountState[]>([])
  const [busy, setBusy] = useState<ReadonlySet<PlatformId>>(new Set())
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = window.radar.accounts.onChange(setAccounts)
    window.radar.accounts.list().then(setAccounts, (e: unknown) => setError(toMessage(e)))
    return unsubscribe
  }, [])

  const run = useCallback(async (action: AccountAction, platformId: PlatformId) => {
    setError(null)
    setBusy((prev) => new Set(prev).add(platformId))
    try {
      setAccounts(await window.radar.accounts[action](platformId))
    } catch (e) {
      setError(toMessage(e))
    } finally {
      setBusy((prev) => {
        const next = new Set(prev)
        next.delete(platformId)
        return next
      })
    }
  }, [])

  const closeBrowser = useCallback(async () => {
    setError(null)
    try {
      setAccounts(await window.radar.accounts.closeBrowser())
    } catch (e) {
      setError(toMessage(e))
    }
  }, [])

  return { accounts, busy, error, run, closeBrowser }
}
