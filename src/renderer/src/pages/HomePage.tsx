import { PLATFORMS } from '../../../shared/platforms'
import type { Opportunity } from '../../../shared/types'
import type { UseAccounts } from '../hooks/useAccounts'
import { useRemote } from '../hooks/useRemote'
import { brl, platformName, scoreTone } from '../lib/format'

type PageTarget = 'varredura' | 'oportunidades' | 'configuracoes'

type Props = {
  accounts: UseAccounts
  onNavigate: (page: PageTarget) => void
}

const DAY_MS = 24 * 60 * 60 * 1000
const TOP_COUNT = 4

const isOpen = (o: Opportunity): boolean => o.status === 'nova' || o.status === 'vista'

export function HomePage({ accounts, onNavigate }: Props) {
  const opps = useRemote(() => window.radar.opportunities.list(), (l) => window.radar.opportunities.onChange(l))
  const purchases = useRemote(() => window.radar.purchases.list())

  const connectable = PLATFORMS.filter((p) => p.connectable)
  const isConnected = (id: string): boolean => accounts.accounts.find((s) => s.platformId === id)?.status === 'conectado'
  const connectedCount = connectable.filter((p) => isConnected(p.id)).length

  const open = (opps.data ?? []).filter(isOpen)
  const today = open.filter((o) => Date.now() - Date.parse(o.foundAt) < DAY_MS)
  const top = [...open].sort((a, b) => b.analysis.score - a.analysis.score).slice(0, TOP_COUNT)
  const potential = top.reduce((sum, o) => sum + Math.max(0, o.analysis.bestProfit ?? 0), 0)
  const realized = (purchases.data ?? []).reduce((sum, p) => sum + (p.soldPrice === null ? 0 : p.soldPrice - p.paidPrice), 0)

  return (
    <div className="page page--wide">
      <header className="hero">
        <p className="eyebrow">Radar Revenda</p>
        <h1>
          Compre barato.
          <br />
          <span className="hero__accent">Revenda com margem.</span>
        </h1>
        <p className="page__lead">
          O Radar varre Marketplace, OLX, Enjoei, Mercado Livre e Shopee, compara com o preço de mercado (e com o Buscapé) e mostra
          só o que vale a pena.
        </p>
      </header>

      <section className="stats stats--four" aria-label="Resumo">
        <div className="stat stat--wide">
          <span className="stat__value">
            {connectedCount}
            <small>/{connectable.length}</small>
          </span>
          <span className="stat__label">contas conectadas</span>
          {!isConnected('facebook') && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate('configuracoes')}>
              Conectar Facebook
            </button>
          )}
        </div>
        <div className="stat">
          <span className="stat__value">{today.length}</span>
          <span className="stat__label">oportunidades em 24 h</span>
        </div>
        <div className="stat">
          <span className="stat__value stat__value--sm">{brl(potential)}</span>
          <span className="stat__label">lucro potencial (top {TOP_COUNT})</span>
        </div>
        <div className="stat">
          <span className={`stat__value stat__value--sm ${realized >= 0 ? 'is-profit' : 'is-loss'}`}>{brl(realized)}</span>
          <span className="stat__label">lucro realizado</span>
        </div>
      </section>

      <section className="top" aria-labelledby="top-title">
        <div className="top__head">
          <h2 id="top-title">Melhores oportunidades agora</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigate('oportunidades')}>
            Ver todas
          </button>
        </div>
        {top.length === 0 ? (
          <div className="empty empty--inline">
            <p>Nenhuma oportunidade ainda. Crie uma busca e rode a varredura.</p>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('varredura')}>
              Ir para Varredura
            </button>
          </div>
        ) : (
          <ol className="top__list">
            {top.map((o) => (
              <li key={o.id}>
                <span className={`score score--${scoreTone(o.analysis.score)}`}>{o.analysis.score.toFixed(1)}</span>
                <div className="top__info">
                  <strong>{o.listing.title}</strong>
                  <small className="muted">
                    {platformName(o.listing.platformId)} · pedindo {brl(o.listing.price)} · mercado {brl(o.analysis.marketUsedPrice)}
                  </small>
                </div>
                <span className="is-profit top__profit">+{brl(o.analysis.bestProfit)}</span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
