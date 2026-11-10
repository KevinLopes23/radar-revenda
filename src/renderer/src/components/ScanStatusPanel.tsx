import type { ScanLogLevel, ScanStatus } from '../../../shared/types'
import { timeAgo } from '../lib/format'

type Props = {
  status: ScanStatus | null
  onStartAll: () => void
  onStop: () => void
}

const LOG_ICON: Record<ScanLogLevel, string> = { info: '•', ok: '✔', aviso: '⚠', erro: '✖' }

function clock(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

export function ScanStatusPanel({ status, onStartAll, onStop }: Props) {
  const isRunning = status?.running ?? false
  const log = [...(status?.log ?? [])].reverse()
  return (
    <section className={`scan-panel${isRunning ? ' is-running' : ''}`} aria-live="polite">
      <div className="scan-panel__head">
        <div className="scan-panel__radar" aria-hidden="true" />
        <div className="scan-panel__info">
          <strong>{isRunning ? 'Varrendo agora' : 'Radar parado'}</strong>
          <span>{status?.message ?? '—'}</span>
          <small className="muted">
            {status?.finishedAt && `Última rodada ${timeAgo(status.finishedAt)}`}
            {status?.nextRunAt && ` · próxima às ${new Date(status.nextRunAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
          </small>
        </div>
        {isRunning ? (
          <button type="button" className="btn btn--danger" onClick={onStop}>
            Parar
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={onStartAll}>
            Rodar todas agora
          </button>
        )}
      </div>
      {log.length > 0 && (
        <ol className="scan-log">
          {log.map((entry) => (
            <li key={`${entry.at}-${entry.message}`} className={`log--${entry.level}`}>
              <time>{clock(entry.at)}</time>
              <span aria-hidden="true">{LOG_ICON[entry.level]}</span>
              {entry.message}
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
