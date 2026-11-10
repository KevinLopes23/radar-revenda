import { useState } from 'react'
import type { SettingsView } from '../../../shared/types'
import { errorMessage } from '../lib/format'

type Props = {
  settings: SettingsView
  onChange: (next: SettingsView) => void
}

export function GeminiSection({ settings, onChange }: Props) {
  const [key, setKey] = useState('')
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isBusy, setBusy] = useState(false)

  const act = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      await action()
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const saveKey = (): Promise<void> =>
    act(async () => {
      onChange(await window.radar.settings.setGeminiKey(key))
      setKey('')
      const result = await window.radar.settings.testGemini()
      setMessage({ ok: result.ok, text: result.ok ? `Chave salva. ${result.message}` : result.message })
    })

  const test = (): Promise<void> =>
    act(async () => {
      const result = await window.radar.settings.testGemini()
      setMessage({ ok: result.ok, text: result.message })
    })

  const clear = (): Promise<void> =>
    act(async () => {
      onChange(await window.radar.settings.clearGeminiKey())
      setMessage({ ok: true, text: 'Chave removida. O app segue analisando sem IA.' })
    })

  return (
    <section className="panel" aria-labelledby="ai-title">
      <h2 id="ai-title">Inteligência artificial (Google Gemini)</h2>
      <p className="muted">
        A IA identifica o modelo exato, o estado e os riscos olhando o texto e a foto de cada anúncio novo. Sem chave, o app usa
        uma análise mais simples pelo título. Gere a chave grátis em aistudio.google.com/apikey.
      </p>
      <p>
        Status:{' '}
        {settings.hasGeminiKey ? <strong className="ok">chave salva (criptografada neste PC)</strong> : <strong className="warn">sem chave</strong>}
      </p>
      <div className="form__row form__row--end">
        <label>
          {settings.hasGeminiKey ? 'Trocar chave' : 'Chave da API'}
          <input type="password" autoComplete="off" value={key} onChange={(e) => setKey(e.target.value)} placeholder="cole a chave aqui" />
        </label>
        <button type="button" className="btn btn--primary" disabled={isBusy || key.trim().length < 20} onClick={() => void saveKey()}>
          Salvar e testar
        </button>
        {settings.hasGeminiKey && (
          <>
            <button type="button" className="btn btn--ghost" disabled={isBusy} onClick={() => void test()}>
              Testar
            </button>
            <button type="button" className="btn btn--danger" disabled={isBusy} onClick={() => void clear()}>
              Remover
            </button>
          </>
        )}
      </div>
      {message && (
        <p className={message.ok ? 'notice-inline ok' : 'alert'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
