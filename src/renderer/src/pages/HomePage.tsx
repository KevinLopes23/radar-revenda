import { PLATFORMS } from '../../../shared/platforms'
import type { UseAccounts } from '../hooks/useAccounts'

type Props = {
  accounts: UseAccounts
  onOpenSettings: () => void
}

const ROADMAP: ReadonlyArray<{ step: string; title: string; isDone: boolean }> = [
  { step: '01', title: 'Contas conectadas e app base', isDone: true },
  { step: '02', title: 'Varredura de buscas nas plataformas', isDone: false },
  { step: '03', title: 'IA + pesquisa de preços + lucro por canal', isDone: false },
  { step: '04', title: 'Painel de oportunidades e alertas', isDone: false },
  { step: '05', title: 'Histórico de compras/vendas e instalador', isDone: false }
]

export function HomePage({ accounts, onOpenSettings }: Props) {
  const connectable = PLATFORMS.filter((p) => p.connectable)
  const isConnected = (id: string): boolean =>
    accounts.accounts.find((s) => s.platformId === id)?.status === 'conectado'
  const connectedCount = connectable.filter((p) => isConnected(p.id)).length
  const isFacebookReady = isConnected('facebook')

  return (
    <div className="page">
      <header className="hero">
        <p className="eyebrow">Radar Revenda</p>
        <h1>
          Compre barato.
          <br />
          <span className="hero__accent">Revenda com margem.</span>
        </h1>
        <p className="page__lead">
          O Radar varre Marketplace, OLX, Enjoei, Mercado Livre e Shopee, compara com o preço de mercado e mostra só o
          que vale a pena.
        </p>
      </header>

      <section className="stats" aria-label="Resumo">
        <div className="stat stat--wide">
          <span className="stat__value">
            {connectedCount}
            <small>/{connectable.length}</small>
          </span>
          <span className="stat__label">contas conectadas</span>
          {!isFacebookReady && (
            <button type="button" className="btn btn--primary" onClick={onOpenSettings}>
              Conectar Facebook
            </button>
          )}
        </div>
        <div className="stat">
          <span className="stat__value">—</span>
          <span className="stat__label">oportunidades hoje</span>
        </div>
        <div className="stat">
          <span className="stat__value">—</span>
          <span className="stat__label">lucro potencial</span>
        </div>
      </section>

      <section className="roadmap" aria-labelledby="roadmap-title">
        <h2 id="roadmap-title">Construção do app</h2>
        <ol>
          {ROADMAP.map((item) => (
            <li key={item.step} className={item.isDone ? 'is-done' : undefined}>
              <span className="roadmap__step">{item.step}</span>
              {item.title}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
