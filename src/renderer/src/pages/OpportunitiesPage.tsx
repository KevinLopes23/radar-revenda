import { useMemo, useState } from 'react'
import { PLATFORMS, type PlatformId } from '../../../shared/platforms'
import type { Opportunity, OpportunityStatus } from '../../../shared/types'
import { Modal } from '../components/Modal'
import { OpportunityCard } from '../components/OpportunityCard'
import { OpportunityDetail } from '../components/OpportunityDetail'
import { ProductArt } from '../components/ProductArt'
import { useRemote } from '../hooks/useRemote'
import { brl, errorMessage, parseMoney } from '../lib/format'

type StatusFilter = 'abertas' | 'todas' | OpportunityStatus
type SortKey = 'nota' | 'lucro' | 'recentes'

const SEARCH_PLATFORMS = PLATFORMS.filter((p) => p.roles.buscaOfertas)

function applyFilters(items: readonly Opportunity[], status: StatusFilter, minScore: number, platform: PlatformId | 'todas', sort: SortKey): Opportunity[] {
  const filtered = items.filter((o) => {
    const statusOk = status === 'todas' || (status === 'abertas' ? o.status === 'nova' || o.status === 'vista' : o.status === status)
    return statusOk && o.analysis.score >= minScore && (platform === 'todas' || o.listing.platformId === platform)
  })
  const by: Record<SortKey, (a: Opportunity, b: Opportunity) => number> = {
    nota: (a, b) => b.analysis.score - a.analysis.score,
    lucro: (a, b) => (b.analysis.bestProfit ?? -Infinity) - (a.analysis.bestProfit ?? -Infinity),
    recentes: (a, b) => b.foundAt.localeCompare(a.foundAt)
  }
  return [...filtered].sort(by[sort])
}

export function OpportunitiesPage() {
  const opps = useRemote(() => window.radar.opportunities.list(), (l) => window.radar.opportunities.onChange(l))
  const [status, setStatus] = useState<StatusFilter>('abertas')
  const [minScore, setMinScore] = useState(0)
  const [platform, setPlatform] = useState<PlatformId | 'todas'>('todas')
  const [sort, setSort] = useState<SortKey>('nota')
  const [selected, setSelected] = useState<Opportunity | null>(null)
  const [buying, setBuying] = useState<Opportunity | null>(null)
  const [paid, setPaid] = useState('')
  const [isSaving, setSaving] = useState(false)

  const visible = useMemo(() => applyFilters(opps.data ?? [], status, minScore, platform, sort), [opps.data, status, minScore, platform, sort])

  const open = (url: string): void => {
    window.radar.app.openExternal(url).catch((e: unknown) => opps.setError(errorMessage(e)))
  }
  const showDetails = (o: Opportunity): void => {
    setSelected(o)
    if (o.status === 'nova') void opps.run(() => window.radar.opportunities.setStatus(o.id, 'vista'))
  }
  const discard = (o: Opportunity): void => void opps.run(() => window.radar.opportunities.setStatus(o.id, 'descartada'))
  const startBuy = (o: Opportunity): void => {
    setBuying(o)
    setPaid(String(o.listing.price).replace('.', ','))
  }

  const confirmBuy = async (): Promise<void> => {
    const price = parseMoney(paid)
    if (!buying || price === null) return opps.setError('Informe quanto você pagou.')
    if (isSaving) return
    setSaving(true)
    try {
      await window.radar.purchases.add({
        title: buying.analysis.productName,
        platformId: buying.listing.platformId,
        paidPrice: price,
        listingUrl: buying.listing.url,
        opportunityId: buying.id,
        notes: ''
      })
      if (await opps.run(() => window.radar.opportunities.setStatus(buying.id, 'comprada'))) setBuying(null)
    } catch (e) {
      opps.setError(errorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page page--wide">
      <header className="page__header page__header--row">
        <div>
          <p className="eyebrow">Oportunidades</p>
          <h1>Achados que valem a pena</h1>
        </div>
        <button type="button" className="btn btn--ghost" onClick={() => void opps.run(() => window.radar.opportunities.clearDiscarded())}>
          Limpar descartadas
        </button>
      </header>

      <div className="filters" role="group" aria-label="Filtros">
        <label>
          Mostrar
          <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
            <option value="abertas">Novas e vistas</option>
            <option value="todas">Todas</option>
            <option value="comprada">Compradas</option>
            <option value="descartada">Descartadas</option>
          </select>
        </label>
        <label>
          Plataforma
          <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId | 'todas')}>
            <option value="todas">Todas</option>
            {SEARCH_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="nota">Maior nota</option>
            <option value="lucro">Maior lucro</option>
            <option value="recentes">Mais recentes</option>
          </select>
        </label>
        <label className="filters__range">
          Nota mínima: <strong>{minScore}</strong>
          <input type="range" min={0} max={10} step={1} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
        </label>
        <span className="muted">{visible.length} resultado(s)</span>
      </div>

      {opps.error && <p className="alert" role="alert">{opps.error}</p>}

      {opps.data && visible.length === 0 ? (
        <div className="empty">
          <ProductArt kind="gamepad" className="empty-art" />
          <h2>Nada por aqui ainda</h2>
          <p>Cadastre buscas na aba Varredura e clique em "Rodar agora". As oportunidades aparecem aqui ordenadas pela nota.</p>
        </div>
      ) : (
        <section className="opp-grid stagger">
          {visible.map((o, i) => (
            <OpportunityCard key={o.id} index={i} opportunity={o} onDetails={showDetails} onOpen={open} onDiscard={discard} onBuy={startBuy} />
          ))}
        </section>
      )}

      <Modal title="Detalhes da oportunidade" isOpen={selected !== null} onClose={() => setSelected(null)} wide>
        {selected && <OpportunityDetail opportunity={selected} onOpen={open} />}
      </Modal>

      <Modal title="Registrar compra" isOpen={buying !== null} onClose={() => setBuying(null)}>
        {buying && (
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault()
              void confirmBuy()
            }}
          >
            <p>
              <strong>{buying.analysis.productName}</strong>
              <br />
              <span className="muted">Anunciado por {brl(buying.listing.price)}</span>
            </p>
            <label>
              Quanto você pagou (R$)
              <input autoFocus inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value)} />
            </label>
            <div className="form__actions">
              <button type="submit" className="btn btn--primary" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar no histórico'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
