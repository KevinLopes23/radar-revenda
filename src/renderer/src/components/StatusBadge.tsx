import type { AccountStatus } from '../../../shared/ipc'

type Props = {
  status: AccountStatus
}

const LABELS: Record<AccountStatus, string> = {
  verificando: 'Verificando',
  desconectado: 'Desconectado',
  abrindo: 'Abrindo',
  'aguardando-login': 'Aguardando login',
  'aguardando-confirmacao': 'Aguardando você',
  conectado: 'Conectado',
  erro: 'Erro'
}

const TONES: Record<AccountStatus, 'ok' | 'idle' | 'busy' | 'bad'> = {
  verificando: 'busy',
  desconectado: 'idle',
  abrindo: 'busy',
  'aguardando-login': 'busy',
  'aguardando-confirmacao': 'busy',
  conectado: 'ok',
  erro: 'bad'
}

export function StatusBadge({ status }: Props) {
  return (
    <span className={`badge badge--${TONES[status]}`} role="status">
      <span className="badge__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  )
}
