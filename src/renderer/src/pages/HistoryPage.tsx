import { useState, type FormEvent } from 'react'
import { PLATFORMS, type PlatformId } from '../../../shared/platforms'
import type { Purchase } from '../../../shared/types'
import { Modal } from '../components/Modal'
import { useRemote } from '../hooks/useRemote'
import { brl, errorMessage, parseMoney, platformName } from '../lib/format'

const RESALE_PLATFORMS = PLATFORMS.filter((p) => p.roles.revenda)
const BUY_PLATFORMS = PLATFORMS.filter((p) => p.roles.buscaOfertas)

function summarize(items: readonly Purchase[]): { invested: number; sold: number; profit: number; inStock: number } {
  const sold = items.filter((p) => p.soldPrice !== null)
  return {
    invested: items.reduce((sum, p) => sum + p.paidPrice, 0),
    sold: sold.reduce((sum, p) => sum + (p.soldPrice ?? 0), 0),
    profit: sold.reduce((sum, p) => sum + (p.soldPrice ?? 0) - p.paidPrice, 0),
    inStock: items.length - sold.length
  }
}

function SellForm({ purchase, onDone }: { purchase: Purchase; onDone: (price: number, channel: PlatformId) => void }) {
  const [price, setPrice] = useState('')
  const [channel, setChannel] = useState<PlatformId>('facebook')
  const handle = (e: FormEvent): void => {
    e.preventDefault()
    const value = parseMoney(price)
    if (value !== null) onDone(value, channel)
  }
  return (
    <form className="form" onSubmit={handle}>
      <p>
        <strong>{purchase.title}</strong> — comprado por {brl(purchase.paidPrice)}
      </p>
      <div className="form__row">
        <label>
          Vendido por (R$)
          <input autoFocus inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          Onde vendeu
          <select value={channel} onChange={(e) => setChannel(e.target.value as PlatformId)}>
            {RESALE_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary" disabled={parseMoney(price) === null}>
          Registrar venda
        </button>
      </div>
    </form>
  )
}

function AddForm({ onDone }: { onDone: (title: string, price: number, platform: PlatformId) => void }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [platform, setPlatform] = useState<PlatformId>('facebook')
  const handle = (e: FormEvent): void => {
    e.preventDefault()
    const value = parseMoney(price)
    if (value !== null) onDone(title, value, platform)
  }
  return (
    <form className="form" onSubmit={handle}>
      <label>
        Produto
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex.: iPhone 13 128GB" />
      </label>
      <div className="form__row">
        <label>
          Pagou (R$)
          <input inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} />
        </label>
        <label>
          Comprou em
          <select value={platform} onChange={(e) => setPlatform(e.target.value as PlatformId)}>
            {BUY_PLATFORMS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form__actions">
        <button type="submit" className="btn btn--primary">
          Adicionar
        </button>
      </div>
    </form>
  )
}

export function HistoryPage() {
  const purchases = useRemote(() => window.radar.purchases.list())
  const [selling, setSelling] = useState<Purchase | null>(null)
  const [isAdding, setAdding] = useState(false)
  const items = purchases.data ?? []
  const totals = summarize(items)

  const sell = async (price: number, channel: PlatformId): Promise<void> => {
    if (!selling) return
    if (await purchases.run(() => window.radar.purchases.sell(selling.id, { soldPrice: price, soldChannel: channel }))) setSelling(null)
  }
  const add = async (title: string, price: number, platform: PlatformId): Promise<void> => {
    const ok = await purchases.run(() =>
      window.radar.purchases.add({ title, platformId: platform, paidPrice: price, listingUrl: null, opportunityId: null, notes: '' })
    )
    if (ok) setAdding(false)
  }
  const remove = (p: Purchase): void => {
    if (window.confirm(`Excluir "${p.title}" do histórico?`)) void purchases.run(() => window.radar.purchases.remove(p.id))
  }
  const open = (url: string): void => {
    window.radar.app.openExternal(url).catch((e: unknown) => purchases.setError(errorMessage(e)))
  }

  return (
    <div className="page page--wide">
      <header className="page__header page__header--row">
        <div>
          <p className="eyebrow">Histórico</p>
          <h1>Compras e vendas</h1>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
          + Adicionar compra
        </button>
      </header>

      <section className="stats stats--four" aria-label="Resumo">
        <div className="stat">
          <span className="stat__value stat__value--sm">{brl(totals.invested)}</span>
          <span className="stat__label">investido</span>
        </div>
        <div className="stat">
          <span className="stat__value stat__value--sm">{brl(totals.sold)}</span>
          <span className="stat__label">vendido</span>
        </div>
        <div className="stat stat--wide">
          <span className={`stat__value stat__value--sm ${totals.profit >= 0 ? 'is-profit' : 'is-loss'}`}>{brl(totals.profit)}</span>
          <span className="stat__label">lucro realizado</span>
        </div>
        <div className="stat">
          <span className="stat__value stat__value--sm">{totals.inStock}</span>
          <span className="stat__label">em estoque</span>
        </div>
      </section>

      {purchases.error && <p className="alert" role="alert">{purchases.error}</p>}

      {items.length === 0 ? (
        <div className="empty">
          <h2>Nenhuma compra registrada</h2>
          <p>Use "Comprei" em uma oportunidade ou adicione manualmente.</p>
        </div>
      ) : (
        <table className="table table--history">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Comprado</th>
              <th>Vendido</th>
              <th>Lucro</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {items.map((p) => {
              const profit = p.soldPrice === null ? null : p.soldPrice - p.paidPrice
              return (
                <tr key={p.id}>
                  <td>
                    {p.listingUrl ? (
                      <button type="button" className="link" onClick={() => open(p.listingUrl ?? '')}>
                        {p.title}
                      </button>
                    ) : (
                      p.title
                    )}
                    <small className="muted"> · {platformName(p.platformId)} · {new Date(p.boughtAt).toLocaleDateString('pt-BR')}</small>
                  </td>
                  <td>{brl(p.paidPrice)}</td>
                  <td>{p.soldPrice === null ? <span className="tag">em estoque</span> : `${brl(p.soldPrice)} (${platformName(p.soldChannel ?? 'facebook')})`}</td>
                  <td className={profit === null ? '' : profit >= 0 ? 'is-profit' : 'is-loss'}>{brl(profit)}</td>
                  <td>
                    <div className="table__actions">
                      {p.soldPrice === null && (
                        <button type="button" className="btn btn--primary btn--sm" onClick={() => setSelling(p)}>
                          Vendi
                        </button>
                      )}
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => remove(p)}>
                        Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <Modal title="Registrar venda" isOpen={selling !== null} onClose={() => setSelling(null)}>
        {selling && <SellForm purchase={selling} onDone={(price, channel) => void sell(price, channel)} />}
      </Modal>
      <Modal title="Adicionar compra" isOpen={isAdding} onClose={() => setAdding(false)}>
        <AddForm onDone={(title, price, platform) => void add(title, price, platform)} />
      </Modal>
    </div>
  )
}
