import type { FlagLevel, Opportunity } from '../../../shared/types'
import { brl, platformName, scoreTone } from '../lib/format'

type Props = {
  opportunity: Opportunity
  onOpen: (url: string) => void
}

const FLAG_ICON: Record<FlagLevel, string> = { alto: '⛔', medio: '⚠', info: 'ℹ', bom: '✔' }
const CONDITION_LABEL = { novo: 'Novo', usado: 'Usado', desconhecido: 'Estado não informado' } as const

export function OpportunityDetail({ opportunity, onOpen }: Props) {
  const { listing, analysis } = opportunity
  return (
    <div className="detail">
      <div className="detail__top">
        {listing.image && <img src={listing.image} alt="" className="detail__img" referrerPolicy="no-referrer" />}
        <div>
          <p className="eyebrow">
            {platformName(listing.platformId)} · {CONDITION_LABEL[analysis.condition]}
            {analysis.aiUsed && ' · identificado pela IA'}
          </p>
          <h3 className="detail__name">{analysis.productName}</h3>
          <p className="detail__sub">Anúncio: {listing.title}</p>
          <div className="detail__kpis">
            <span className={`score score--${scoreTone(analysis.score)} score--lg`}>{analysis.score.toFixed(1)}</span>
            <div>
              <strong>{brl(listing.price)}</strong>
              <small>pedindo</small>
            </div>
            <div>
              <strong>{brl(analysis.marketUsedPrice)}</strong>
              <small>mercado usado</small>
            </div>
            <div>
              <strong>{brl(analysis.marketNewPrice)}</strong>
              <small>novo</small>
            </div>
          </div>
          <button type="button" className="btn btn--primary" onClick={() => onOpen(listing.url)}>
            Abrir anúncio
          </button>
        </div>
      </div>

      {analysis.flags.length > 0 && (
        <section>
          <h4>Alertas</h4>
          <ul className="flags">
            {analysis.flags.map((f) => (
              <li key={f.text} className={`flag flag--${f.level}`}>
                <span aria-hidden="true">{FLAG_ICON[f.level]}</span> {f.text}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h4>Lucro por canal de revenda</h4>
        {analysis.channels.length === 0 ? (
          <p className="muted">Sem preço de mercado suficiente para calcular.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Canal</th>
                <th>Vender por</th>
                <th>Taxas</th>
                <th>Lucro</th>
              </tr>
            </thead>
            <tbody>
              {analysis.channels.map((c) => (
                <tr key={c.platformId}>
                  <td>{platformName(c.platformId)}</td>
                  <td>{brl(c.salePrice)}</td>
                  <td>{brl(c.fees)}</td>
                  <td className={c.profit > 0 ? 'is-profit' : 'is-loss'}>{brl(c.profit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h4>Anúncios parecidos usados na comparação ({analysis.comparables.length})</h4>
        <ul className="comps">
          {analysis.comparables.map((c) => (
            <li key={c.url}>
              <button type="button" className="link" onClick={() => onOpen(c.url)}>
                {c.title}
              </button>
              <span className="muted">
                {platformName(c.platformId)} · {c.condition}
              </span>
              <strong>{brl(c.price)}</strong>
            </li>
          ))}
        </ul>
      </section>

      {listing.text && (
        <details>
          <summary>Texto do anúncio</summary>
          <pre className="raw">{listing.text}</pre>
        </details>
      )}
    </div>
  )
}
