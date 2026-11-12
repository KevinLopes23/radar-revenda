import { useState } from 'react'
import type { AiEngineId, SettingsView } from '../../../shared/types'
import { errorMessage } from '../lib/format'

type Props = {
  settings: SettingsView
  onChange: (next: SettingsView) => void
}

const CLAUDE_MODELS: { id: string; label: string }[] = [
  { id: 'haiku', label: 'Haiku — barato e rápido (recomendado)' },
  { id: 'sonnet', label: 'Sonnet — equilíbrio' },
  { id: 'opus', label: 'Opus — máximo (mais caro)' }
]

type EnginePatch = { aiEngine?: AiEngineId; claudeModel?: string }

export function AiEngineSection({ settings, onChange }: Props) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [isBusy, setBusy] = useState(false)

  const update = async (patch: EnginePatch): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const { hasGeminiKey: _ignored, ...current } = settings
      onChange(await window.radar.settings.save({ ...current, ...patch }))
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const testClaude = async (): Promise<void> => {
    setBusy(true)
    setMessage(null)
    try {
      const result = await window.radar.settings.testClaude()
      setMessage({ ok: result.ok, text: result.message })
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    } finally {
      setBusy(false)
    }
  }

  const isClaude = settings.aiEngine === 'claude'

  return (
    <section className="panel" aria-labelledby="engine-title">
      <h2 id="engine-title">Motor de análise da IA</h2>
      <p className="muted">Quem lê cada anúncio e identifica produto, defeitos e veredito. Você pode trocar quando quiser.</p>

      <label className="check">
        <input type="radio" name="ai-engine" checked={!isClaude} disabled={isBusy} onChange={() => void update({ aiEngine: 'gemini' })} />
        <span>
          <strong>Google Gemini</strong> — grátis, mas em horário de pico fica sobrecarregado e pode falhar.
        </span>
      </label>
      <label className="check">
        <input type="radio" name="ai-engine" checked={isClaude} disabled={isBusy} onChange={() => void update({ aiEngine: 'claude' })} />
        <span>
          <strong>Claude local</strong> — usa o Claude Code deste computador (a sua assinatura). Confiável e sem sobrecarga.
        </span>
      </label>

      {isClaude && (
        <>
          <p className="muted small">
            Quando a varredura termina, o app chama o Claude aqui na máquina e analisa todos os anúncios de uma vez. Cada
            varredura consome um pouco do seu limite de uso do Claude. Precisa ter o Claude Code instalado e logado.
          </p>
          <div className="form__row form__row--end">
            <label>
              Modelo do Claude
              <select value={settings.claudeModel} disabled={isBusy} onChange={(e) => void update({ claudeModel: e.target.value })}>
                {CLAUDE_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" className="btn btn--ghost" disabled={isBusy} onClick={() => void testClaude()}>
              Testar Claude
            </button>
          </div>
        </>
      )}

      {message && (
        <p className={message.ok ? 'notice-inline ok' : 'alert'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
