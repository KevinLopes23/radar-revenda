import { useState, type FormEvent } from 'react'
import type { AccountState } from '../../../shared/ipc'
import { PLATFORMS, type PlatformId } from '../../../shared/platforms'
import type { SavedSearch, SearchInput } from '../../../shared/types'
import { parseMoney } from '../lib/format'

type Props = {
  initial: SavedSearch | null
  accounts: readonly AccountState[]
  isBusy: boolean
  onSubmit: (input: SearchInput) => void
  onCancel: () => void
}

const SEARCH_PLATFORMS = PLATFORMS.filter((p) => p.roles.buscaOfertas)
const DEFAULT_PLATFORMS: readonly PlatformId[] = ['facebook', 'olx', 'enjoei', 'mercadolivre']

const toText = (value: number | null): string => (value === null ? '' : String(value))

export function SearchForm({ initial, accounts, isBusy, onSubmit, onCancel }: Props) {
  const [query, setQuery] = useState(initial?.query ?? '')
  const [minPrice, setMinPrice] = useState(toText(initial?.minPrice ?? null))
  const [maxPrice, setMaxPrice] = useState(toText(initial?.maxPrice ?? null))
  const [platforms, setPlatforms] = useState<readonly PlatformId[]>(initial?.platforms ?? DEFAULT_PLATFORMS)
  const [active, setActive] = useState(initial?.active ?? true)

  const toggle = (id: PlatformId): void =>
    setPlatforms((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    onSubmit({ query, minPrice: parseMoney(minPrice), maxPrice: parseMoney(maxPrice), platforms, active })
  }

  return (
    <form className="form" onSubmit={handleSubmit}>
      <label>
        O que procurar
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ex.: iphone 13, ps5, furadeira makita" />
      </label>
      <div className="form__row">
        <label>
          Preço mínimo (R$)
          <input inputMode="decimal" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="opcional" />
        </label>
        <label>
          Preço máximo (R$)
          <input inputMode="decimal" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="opcional" />
        </label>
      </div>
      <fieldset className="checks">
        <legend>Onde procurar</legend>
        {SEARCH_PLATFORMS.map((p) => {
          const status = accounts.find((a) => a.platformId === p.id)?.status
          const note = p.loginRequired && status !== 'conectado' ? 'conecte a conta' : status === 'conectado' ? 'conectado' : ''
          return (
            <label key={p.id} className="check">
              <input type="checkbox" checked={platforms.includes(p.id)} onChange={() => toggle(p.id)} />
              {p.name}
              {note && <small className={status === 'conectado' ? 'ok' : 'warn'}>{note}</small>}
            </label>
          )
        })}
      </fieldset>
      <label className="check">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Incluir na varredura automática
      </label>
      <p className="muted small">O Buscapé entra sozinho em toda busca como referência de preço de produto novo.</p>
      <div className="form__actions">
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="btn btn--primary" disabled={isBusy}>
          {initial ? 'Salvar alterações' : 'Criar busca'}
        </button>
      </div>
    </form>
  )
}
