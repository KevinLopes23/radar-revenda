import { PLATFORMS } from '../../../shared/platforms'
import { Icon } from '../components/Icon'
import { PlatformCard } from '../components/PlatformCard'
import type { UseAccounts } from '../hooks/useAccounts'

type Props = {
  accounts: UseAccounts
}

export function SettingsPage({ accounts }: Props) {
  const { accounts: states, busy, error, run, closeBrowser } = accounts
  const connectable = PLATFORMS.filter((p) => p.connectable)
  const connectedCount = connectable.filter(
    (p) => states.find((s) => s.platformId === p.id)?.status === 'conectado'
  ).length

  return (
    <div className="page">
      <header className="page__header">
        <p className="eyebrow">Configurações</p>
        <h1>Contas conectadas</h1>
        <p className="page__lead">
          Conecte suas contas para o Radar buscar ofertas e comparar preços em cada plataforma.{' '}
          <strong>
            {connectedCount} de {connectable.length}
          </strong>{' '}
          conectadas.
        </p>
      </header>

      <aside className="notice">
        <Icon name="shield" size={22} />
        <p>
          O login é feito por você, numa janela do Chrome do próprio app. O Radar <strong>nunca vê nem guarda sua
          senha</strong>; a sessão fica salva só neste computador e pode ser apagada a qualquer momento em
          &quot;Desconectar&quot;.
        </p>
        <button type="button" className="btn btn--ghost" onClick={() => void closeBrowser()}>
          Fechar navegador do app
        </button>
      </aside>

      {error && (
        <p className="alert" role="alert">
          {error}
        </p>
      )}

      <section className="platform-grid" aria-label="Plataformas">
        {PLATFORMS.map((platform) => (
          <PlatformCard
            key={platform.id}
            platform={platform}
            account={states.find((s) => s.platformId === platform.id)}
            isBusy={busy.has(platform.id)}
            onConnect={(id) => void run('connect', id)}
            onConfirm={(id) => void run('confirm', id)}
            onDisconnect={(id) => void run('disconnect', id)}
          />
        ))}
      </section>

      <section className="later" aria-label="Em breve">
        <div className="later__item">
          <h2>Inteligência artificial</h2>
          <p>Chave da API do Google Gemini para identificar produtos e analisar fotos.</p>
          <span className="pill">Etapa 3</span>
        </div>
        <div className="later__item">
          <h2>Taxas de revenda</h2>
          <p>Comissão, taxa fixa e frete de cada canal para calcular o lucro real.</p>
          <span className="pill">Etapa 3</span>
        </div>
        <div className="later__item">
          <h2>Ritmo da varredura</h2>
          <p>Intervalo entre rodadas e limite de anúncios por vez, para proteger suas contas.</p>
          <span className="pill">Etapa 2</span>
        </div>
      </section>
    </div>
  )
}
