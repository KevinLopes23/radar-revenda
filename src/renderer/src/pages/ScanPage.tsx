import { useState } from 'react'
import type { AccountState } from '../../../shared/ipc'
import type { SavedSearch, SearchInput } from '../../../shared/types'
import { Modal } from '../components/Modal'
import { ProductArt } from '../components/ProductArt'
import { ScanStatusPanel } from '../components/ScanStatusPanel'
import { SearchForm } from '../components/SearchForm'
import { useRemote } from '../hooks/useRemote'
import { brl, platformName, timeAgo } from '../lib/format'

type Props = {
  accounts: readonly AccountState[]
}

type Editing = { mode: 'new' } | { mode: 'edit'; search: SavedSearch } | null

function priceRange(s: SavedSearch): string {
  if (s.minPrice === null && s.maxPrice === null) return 'qualquer preço'
  if (s.minPrice === null) return `até ${brl(s.maxPrice)}`
  if (s.maxPrice === null) return `a partir de ${brl(s.minPrice)}`
  return `${brl(s.minPrice)} a ${brl(s.maxPrice)}`
}

export function ScanPage({ accounts }: Props) {
  const searches = useRemote(() => window.radar.searches.list())
  const scan = useRemote(() => window.radar.scan.status(), (l) => window.radar.scan.onStatus(l))
  const [editing, setEditing] = useState<Editing>(null)

  const save = async (input: SearchInput): Promise<void> => {
    const ok = await searches.run(() =>
      editing?.mode === 'edit' ? window.radar.searches.update(editing.search.id, input) : window.radar.searches.create(input)
    )
    if (ok) setEditing(null)
  }

  const toggleActive = (s: SavedSearch): void =>
    void searches.run(() => window.radar.searches.update(s.id, { ...s, active: !s.active }))

  const remove = (s: SavedSearch): void => {
    if (window.confirm(`Excluir a busca "${s.query}"?`)) void searches.run(() => window.radar.searches.remove(s.id))
  }

  const isRunning = scan.data?.running ?? false
  const list = searches.data ?? []

  return (
    <div className="page page--wide">
      <header className="page__header page__header--row">
        <div>
          <p className="eyebrow">Varredura</p>
          <h1>Buscas salvas</h1>
          <p className="page__lead">Cada busca roda em todas as plataformas marcadas, compara os preços e manda o resultado para Oportunidades.</p>
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setEditing({ mode: 'new' })}>
          + Nova busca
        </button>
      </header>

      <ScanStatusPanel
        status={scan.data}
        onStartAll={() => void scan.run(() => window.radar.scan.start(null))}
        onStop={() => void scan.run(() => window.radar.scan.stop())}
      />

      {(searches.error || scan.error) && <p className="alert" role="alert">{searches.error ?? scan.error}</p>}

      {list.length === 0 ? (
        <div className="empty">
          <ProductArt kind="camera" className="empty-art" />
          <h2>Nenhuma busca ainda</h2>
          <p>Comece com algo que você conhece bem, como "iphone 13" até R$ 2.000.</p>
          <button type="button" className="btn btn--primary" onClick={() => setEditing({ mode: 'new' })}>
            Criar primeira busca
          </button>
        </div>
      ) : (
        <ul className="search-list stagger">
          {list.map((s, i) => (
            <li key={s.id} className={`search${s.active ? '' : ' is-paused'}`} style={{ ['--i' as string]: i }}>
              <div className="search__main">
                <h3>{s.query}</h3>
                <p className="muted">
                  {priceRange(s)} · rodou {timeAgo(s.lastRunAt)}
                  {!s.active && ' · pausada'}
                </p>
                <ul className="chips">
                  {s.platforms.map((p) => (
                    <li key={p}>{platformName(p)}</li>
                  ))}
                </ul>
              </div>
              <div className="search__actions">
                <button type="button" className="btn btn--primary btn--sm" disabled={isRunning} onClick={() => void scan.run(() => window.radar.scan.start(s.id))}>
                  Rodar agora
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => setEditing({ mode: 'edit', search: s })}>
                  Editar
                </button>
                <button type="button" className="btn btn--ghost btn--sm" onClick={() => toggleActive(s)}>
                  {s.active ? 'Pausar' : 'Ativar'}
                </button>
                <button type="button" className="btn btn--danger btn--sm" onClick={() => remove(s)}>
                  Excluir
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal title={editing?.mode === 'edit' ? 'Editar busca' : 'Nova busca'} isOpen={editing !== null} onClose={() => setEditing(null)}>
        {searches.error && <p className="alert" role="alert">{searches.error}</p>}
        <SearchForm
          initial={editing?.mode === 'edit' ? editing.search : null}
          accounts={accounts}
          isBusy={searches.isBusy}
          onSubmit={(input) => void save(input)}
          onCancel={() => setEditing(null)}
        />
      </Modal>
    </div>
  )
}
