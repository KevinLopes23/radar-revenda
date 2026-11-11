import type { CSSProperties } from 'react'
import type { AccountState } from '../../../shared/ipc'
import type { Platform, PlatformId } from '../../../shared/platforms'
import { PLATFORM_LOGOS } from '../lib/platformLogos'
import { StatusBadge } from './StatusBadge'

type Props = {
  platform: Platform
  account: AccountState | undefined
  isBusy: boolean
  onConnect: (id: PlatformId) => void
  onConfirm: (id: PlatformId) => void
  onDisconnect: (id: PlatformId) => void
}

const ROLE_LABELS: ReadonlyArray<[keyof Platform['roles'], string]> = [
  ['buscaOfertas', 'Busca ofertas'],
  ['precoReferencia', 'Preço de referência'],
  ['revenda', 'Revenda']
]

function Actions({ platform, account, isBusy, onConnect, onConfirm, onDisconnect }: Props) {
  if (!platform.connectable) return <p className="platform__note">Sempre ativo</p>
  const status = account?.status ?? 'verificando'
  const isLocked = isBusy || status === 'verificando' || status === 'abrindo'

  if (status === 'aguardando-confirmacao') {
    return (
      <div className="platform__actions">
        <button type="button" className="btn btn--primary" disabled={isLocked} onClick={() => onConfirm(platform.id)}>
          Já entrei
        </button>
        <button type="button" className="btn btn--ghost" disabled={isLocked} onClick={() => onConnect(platform.id)}>
          Abrir de novo
        </button>
      </div>
    )
  }

  if (status === 'conectado') {
    const handleDisconnect = (): void => {
      if (window.confirm(`Desconectar ${platform.name}? A sessão será apagada deste computador.`)) {
        onDisconnect(platform.id)
      }
    }
    return (
      <div className="platform__actions">
        <button type="button" className="btn btn--ghost" disabled={isLocked} onClick={() => onConnect(platform.id)}>
          Abrir site
        </button>
        <button type="button" className="btn btn--danger" disabled={isLocked} onClick={handleDisconnect}>
          Desconectar
        </button>
      </div>
    )
  }

  return (
    <div className="platform__actions">
      <button type="button" className="btn btn--primary" disabled={isLocked} onClick={() => onConnect(platform.id)}>
        {status === 'aguardando-login' ? 'Mostrar janela' : 'Conectar'}
      </button>
    </div>
  )
}

export function PlatformCard(props: Props) {
  const { platform, account } = props
  const style = { '--brand': platform.color } as CSSProperties
  const logo = PLATFORM_LOGOS[platform.id]
  return (
    <article className="platform" style={style} aria-labelledby={`platform-${platform.id}`}>
      <header className="platform__head">
        <span className={`platform__logo${logo.onBrand ? ' platform__logo--on-brand' : ''}`} aria-hidden="true">
          <img src={logo.src} alt="" draggable={false} />
        </span>
        <div className="platform__title">
          <h3 id={`platform-${platform.id}`}>{platform.name}</h3>
          {platform.loginRequired && <span className="platform__required">Obrigatório</span>}
        </div>
        {account && <StatusBadge status={account.status} />}
      </header>
      <ul className="platform__roles" aria-label="Uso no app">
        {ROLE_LABELS.filter(([key]) => platform.roles[key]).map(([key, label]) => (
          <li key={key}>{label}</li>
        ))}
      </ul>
      <p className="platform__hint">{platform.hint}</p>
      {account?.message && <p className="platform__message">{account.message}</p>}
      <Actions {...props} />
    </article>
  )
}
