import { useState } from 'react'
import { PLATFORMS, type PlatformId } from '../../../shared/platforms'
import type { ChannelFee, Settings, SettingsView } from '../../../shared/types'
import { errorMessage } from '../lib/format'

type Props = {
  settings: SettingsView
  onChange: (next: SettingsView) => void
}

const RESALE_PLATFORMS = PLATFORMS.filter((p) => p.roles.revenda)

function NumberField({ label, value, onChange, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; step?: number; suffix?: string }) {
  return (
    <label>
      {label}
      <span className="input-suffix">
        <input type="number" step={step} min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        {suffix && <span>{suffix}</span>}
      </span>
    </label>
  )
}

function stripView({ hasGeminiKey: _ignored, ...settings }: SettingsView): Settings {
  return settings
}

export function PreferencesSection({ settings, onChange }: Props) {
  const [draft, setDraft] = useState<Settings>(() => stripView(settings))
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  const setFee = (id: PlatformId, field: keyof ChannelFee, value: number): void =>
    setDraft((d) => ({ ...d, fees: { ...d.fees, [id]: { ...d.fees[id], [field]: value } } }))
  const setScan = (field: keyof Settings['scan'], value: number | boolean): void =>
    setDraft((d) => ({ ...d, scan: { ...d.scan, [field]: value } }))

  const save = async (): Promise<void> => {
    setMessage(null)
    try {
      const saved = await window.radar.settings.save(draft)
      onChange(saved)
      setDraft(stripView(saved))
      setMessage({ ok: true, text: 'Configurações salvas.' })
    } catch (e) {
      setMessage({ ok: false, text: errorMessage(e) })
    }
  }

  return (
    <section className="panel" aria-labelledby="prefs-title">
      <h2 id="prefs-title">Revenda e varredura</h2>

      <h3>Taxas de cada canal de revenda</h3>
      <p className="muted small">Confira as taxas atuais na sua conta de cada plataforma; os valores padrão são aproximados.</p>
      <table className="table table--fees">
        <thead>
          <tr>
            <th>Canal</th>
            <th>Comissão (%)</th>
            <th>Taxa fixa (R$)</th>
            <th>Frete por sua conta (R$)</th>
          </tr>
        </thead>
        <tbody>
          {RESALE_PLATFORMS.map((p) => (
            <tr key={p.id}>
              <td>{p.name}</td>
              {(['percent', 'fixed', 'shipping'] as const).map((field) => (
                <td key={field}>
                  <input
                    type="number"
                    min={0}
                    step={field === 'percent' ? 0.5 : 1}
                    aria-label={`${p.name} ${field}`}
                    value={draft.fees[p.id][field]}
                    onChange={(e) => setFee(p.id, field, Number(e.target.value))}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="form__grid">
        <NumberField label="Desconto para vender rápido" suffix="%" value={draft.quickSaleDiscountPct} onChange={(v) => setDraft((d) => ({ ...d, quickSaleDiscountPct: v }))} />
        <NumberField label="Custo extra por compra (deslocamento etc.)" suffix="R$" value={draft.extraCostPerPurchase} onChange={(v) => setDraft((d) => ({ ...d, extraCostPerPurchase: v }))} />
        <label>
          Região da OLX
          <input value={draft.olxRegionPath} onChange={(e) => setDraft((d) => ({ ...d, olxRegionPath: e.target.value }))} placeholder="ex.: estado-sp/regiao-de-bauru-e-marilia (vazio = Brasil)" />
        </label>
        <label>
          Modelo do Gemini
          <input value={draft.geminiModel} onChange={(e) => setDraft((d) => ({ ...d, geminiModel: e.target.value }))} />
        </label>
      </div>

      <h3>Ritmo da varredura</h3>
      <p className="muted small">Ritmo calmo protege suas contas: poucos anúncios por vez e intervalos longos.</p>
      <label className="check">
        <input type="checkbox" checked={draft.scan.autoEnabled} onChange={(e) => setScan('autoEnabled', e.target.checked)} />
        Varrer automaticamente enquanto o app estiver aberto
      </label>
      <div className="form__grid">
        <NumberField label="Intervalo entre rodadas" suffix="min" value={draft.scan.intervalMinutes} onChange={(v) => setScan('intervalMinutes', v)} />
        <NumberField label="Anúncios lidos por plataforma" value={draft.scan.maxPerPlatform} onChange={(v) => setScan('maxPerPlatform', v)} />
        <NumberField label="Análises novas por busca" value={draft.scan.maxAnalysesPerRun} onChange={(v) => setScan('maxAnalysesPerRun', v)} />
        <NumberField label="Notificar a partir da nota" step={0.5} value={draft.scan.minScoreToNotify} onChange={(v) => setScan('minScoreToNotify', v)} />
      </div>

      {message && (
        <p className={message.ok ? 'notice-inline ok' : 'alert'} role="status">
          {message.text}
        </p>
      )}
      <div className="form__actions">
        <button type="button" className="btn btn--primary" onClick={() => void save()}>
          Salvar configurações
        </button>
      </div>
    </section>
  )
}
