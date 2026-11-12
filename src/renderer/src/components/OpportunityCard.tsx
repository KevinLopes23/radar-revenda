import type { MouseEvent } from 'react'
import type { Opportunity } from '../../../shared/types'
import { brl, platformName, scoreTone, timeAgo } from '../lib/format'

type Props = {
  opportunity: Opportunity
  /** Posição na lista (para a animação de entrada em cascata). */
  index: number
  onDetails: (o: Opportunity) => void
  onOpen: (url: string) => void
  onDiscard: (o: Opportunity) => void
  onBuy: (o: Opportunity) => void
}

/** Luz que acompanha o mouse dentro do card. */
function trackPointer(e: MouseEvent<HTMLElement>): void {
  const rect = e.currentTarget.getBoundingClientRect()
  e.currentTarget.style.setProperty('--mx', `${e.clientX - rect.left}px`)
  e.currentTarget.style.setProperty('--my', `${e.clientY - rect.top}px`)
}

export function OpportunityCard({ opportunity, index, onDetails, onOpen, onDiscard, onBuy }: Props) {
  const { listing, analysis, status } = opportunity
  const tone = scoreTone(analysis.score)
  const highRisks = analysis.flags.filter((f) => f.level === 'alto').length
  const isGoodSign = analysis.flags.some((f) => f.level === 'bom')
  const isDone = status === 'descartada' || status === 'comprada'

  return (
    <article
      className={`opp spotlight${isDone ? ' opp--done' : ''}`}
      style={{ ['--i' as string]: index }}
      onMouseMove={trackPointer}
    >
      <button type="button" className="opp__media" onClick={() => onDetails(opportunity)} aria-label={`Detalhes de ${listing.title}`}>
        {listing.image ? <img src={listing.image} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span>sem foto</span>}
        <span className={`score score--${tone}`} title="Nota da oportunidade">
          {analysis.score.toFixed(1)}
        </span>
        {status === 'nova' && <span className="opp__new">nova</span>}
      </button>

      <div className="opp__body">
        <p className="opp__meta">
          {platformName(listing.platformId)} · {timeAgo(opportunity.foundAt)}
          {listing.location && ` · ${listing.location}`}
        </p>
        <h3 className="opp__title" title={listing.title}>
          {listing.title}
        </h3>

        <dl className="opp__prices">
          <div>
            <dt>Pedindo</dt>
            <dd>{brl(listing.price)}</dd>
          </div>
          <div>
            <dt>Mercado{analysis.marketUsedEstimated ? ' · usado (estimado)' : ''}</dt>
            <dd title={analysis.marketUsedEstimated ? 'Preço médio do usado estimado pela IA' : undefined}>
              {analysis.marketUsedEstimated && analysis.marketUsedPrice !== null ? '~' : ''}
              {brl(analysis.marketUsedPrice ?? analysis.marketNewPrice)}
            </dd>
          </div>
          <div className={analysis.bestProfit !== null && analysis.bestProfit > 0 ? 'is-profit' : 'is-loss'}>
            <dt>Lucro{analysis.bestChannel ? ` · vendendo na ${platformName(analysis.bestChannel).replace(' Marketplace', '')}` : ''}</dt>
            <dd>
              {brl(analysis.bestProfit)}
              {analysis.repairCost ? <small className="opp__repair"> (−{brl(analysis.repairCost)} conserto)</small> : null}
            </dd>
          </div>
        </dl>

        <p className="opp__tags">
          {highRisks > 0 && <span className="tag tag--bad">⚠ {highRisks} risco(s)</span>}
          {isGoodSign && <span className="tag tag--good">vendedor com pressa</span>}
          {analysis.liquidity === 'baixa' && <span className="tag tag--bad">revenda lenta</span>}
          {analysis.aiUsed && <span className="tag">IA</span>}
          {analysis.comparables.length > 0 ? (
            <span className="tag">{analysis.comparables.length} comparações</span>
          ) : analysis.marketUsedEstimated ? (
            <span className="tag">preço estimado</span>
          ) : (
            <span className="tag">sem comparação</span>
          )}
        </p>

        <div className="opp__actions">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onOpen(listing.url)}>
            Ver anúncio
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDetails(opportunity)}>
            Detalhes
          </button>
          {!isDone && (
            <>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onBuy(opportunity)}>
                Comprei
              </button>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => onDiscard(opportunity)} aria-label="Descartar">
                Descartar
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  )
}
