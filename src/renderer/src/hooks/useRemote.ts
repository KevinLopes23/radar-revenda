import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '../lib/format'

export interface Remote<T> {
  readonly data: T | null
  readonly error: string | null
  readonly isBusy: boolean
  /** Executa uma ação no processo principal e substitui os dados pelo resultado. */
  run(action: () => Promise<T>): Promise<boolean>
  setError(message: string | null): void
}

/** Dados vindos do processo principal (carga inicial + eventos opcionais de atualização). */
export function useRemote<T>(load: () => Promise<T>, subscribe?: (listener: (value: T) => void) => () => void): Remote<T> {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isBusy, setBusy] = useState(false)

  useEffect(() => {
    let isActive = true
    // Se um evento chegar antes da carga inicial, ele é mais novo: a carga é descartada.
    let hasEvent = false
    load().then(
      (value) => isActive && !hasEvent && setData(value),
      (e: unknown) => isActive && setError(errorMessage(e))
    )
    const unsubscribe = subscribe?.((value) => {
      hasEvent = true
      setData(value)
    })
    return () => {
      isActive = false
      unsubscribe?.()
    }
    // load/subscribe são funções estáveis da API exposta pelo preload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const run = useCallback(async (action: () => Promise<T>): Promise<boolean> => {
    setError(null)
    setBusy(true)
    try {
      setData(await action())
      return true
    } catch (e) {
      setError(errorMessage(e))
      return false
    } finally {
      setBusy(false)
    }
  }, [])

  return { data, error, isBusy, run, setError }
}
