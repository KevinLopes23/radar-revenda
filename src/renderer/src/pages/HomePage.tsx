import { PLATFORMS } from '../../../shared/platforms'
import type { Opportunity } from '../../../shared/types'
import { CountUp } from '../components/CountUp'
import { HeroMosaic } from '../components/HeroMosaic'
import { ProductArt } from '../components/ProductArt'
import { RotatingWord } from '../components/RotatingWord'
import type { UseAccounts } from '../hooks/useAccounts'
import { useRemote } from '../hooks/useRemote'
import { brl, netSaleProfit, platformName, scoreTone } from '../lib/format'

type PageTarget = 'varredura' | 'oportunidades' | 'configuracoes'

type Props = {
  accounts: UseAccounts
  onNavigate: (page: PageTarget) => void
}

const DAY_MS = 24 * 60 * 60 * 1000
const TOP_COUNT = 4
const MOSAIC_IMAGES = 15
const HOT_WORDS = ['iPhone', 'PS5', 'Makita', 'AirPods', 'notebook', 'Switch', 'câmera'] as const

const isOpen = (o: Opportunity): boolean => o.status === 'nova' || o.status === 'vista'

export function HomePage({ accounts, onNavigate }: Props) {
  const opps = useRemote(() => window.radar.opportunities.list(), (l) => window.radar.opportunities.onChange(l))
  const purchases = useRemote(() => window.radar.purchases.list())
  const settings = useRemote(() => window.radar.settings.get())

  const connectable = PLATFORMS.filter((p) => p.connectable)
  const isConnected = (id: string): boolean => accounts.accounts.find((s) => s.platformId === id)?.status === 'conectado'
  const connectedCount = connectable.filter((p) => isConnected(p.id)).length

  const open = (opps.data ?? []).filter(isOpen)
  const today = open.filter((o) => Date.now() - Date.parse(o.foundAt) < DAY_MS)
  const ranked = [...open].sort((a, b) => b.analysis.score - a.analysis.score)
  const top = ranked.slice(0, TOP_COUNT)
  const potential = top.reduce((sum, o) => sum + Math.max(0, o.analysis.bestProfit ?? 0), 0)
  const fees = settings.data?.fees ?? null
  const realized = (purchases.data ?? []).reduce((sum, p) => sum + (netSaleProfit(p, fees) ?? 0), 0)
  const images = ranked.flatMap((o) => (o.listing.image ? [o.listing.image] : [])).slice(0, MOSAIC_IMAGES)

  return (
    <div className="page page--wide">
      <header className="hero hero--split">
        <div>
          <p className="eyebrow">Seu achadão do dia</p>
          <h1>
            <span className="hero__brand">Achadão</span>
            <span className="hero__line">
              Ache o próximo <RotatingWord words={HOT_WORDS} /> antes de todo mundo.
            </span>
          </h1>
          <p className="page__lead">
            Varremos Marketplace, OLX, Enjoei, Mercado Livre e Shopee, comparamos com o preço de mercado (e com o Buscapé) e
            mostramos só o que dá lucro na revenda.
          </p>
          <div className="hero__cta">
            <button type="button" className="btn btn--primary btn--lg" onClick={() => onNavigate('oportunidades')}>
              Ver achados
            </button>
            <button type="button" className="btn btn--ghost btn--lg" onClick={() => onNavigate('varredura')}>
              Nova busca
            </button>
          </div>
        </div>
        <HeroMosaic images={images} />
      </header>

      <section className="stats stats--four stagger" aria-label="Resumo">
        <div className="stat stat--wide" style={{ ['--i' as string]: 0 }}>
          <span className="stat__value">
            <CountUp value={connectedCount} />
            <small>/{connectable.length}</small>
          </span>
          <span className="stat__label">contas conectadas</span>
          {!isConnected('facebook') && (
            <button type="button" className="btn btn--primary btn--sm" onClick={() => onNavigate('configuracoes')}>
              Conectar Facebook
            </button>
          )}
        </div>
        <div className="stat" style={{ ['--i' as string]: 1 }}>
          <span className="stat__value">
            <CountUp value={today.length} />
          </span>
          <span className="stat__label">achados em 24 h</span>
        </div>
        <div className="stat" style={{ ['--i' as string]: 2 }}>
          <span className="stat__value stat__value--sm is-profit">
            <CountUp value={potential} format={brl} />
          </span>
          <span className="stat__label">lucro potencial (top {TOP_COUNT})</span>
        </div>
        <div className="stat" style={{ ['--i' as string]: 3 }}>
          <span className={`stat__value stat__value--sm ${realized >= 0 ? 'is-profit' : 'is-loss'}`}>
            <CountUp value={realized} format={brl} />
          </span>
          <span className="stat__label">lucro realizado</span>
        </div>
      </section>

      <section className="top" aria-labelledby="top-title">
        <div className="top__head">
          <h2 id="top-title">Melhores achados agora</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onNavigate('oportunidades')}>
            Ver todos
          </button>
        </div>
        {top.length === 0 ? (
          <div className="empty empty--inline">
            <ProductArt kind="phone" className="empty-art" />
            <p>Nenhum achado ainda. Crie uma busca e rode a varredura.</p>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('varredura')}>
              Ir para Varredura
            </button>
          </div>
        ) : (
          <ol className="top__list stagger">
            {top.map((o, i) => (
              <li key={o.id} style={{ ['--i' as string]: i }}>
                <span className={`score score--${scoreTone(o.analysis.score)}`}>{o.analysis.score.toFixed(1)}</span>
                {o.listing.image && <img className="top__thumb" src={o.listing.image} alt="" referrerPolicy="no-referrer" />}
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
