import { PLATFORMS } from '../../../shared/platforms'
import { AiEngineSection } from '../components/AiEngineSection'
import { GeminiSection } from '../components/GeminiSection'
import { Icon } from '../components/Icon'
import { PlatformCard } from '../components/PlatformCard'
import { PreferencesSection } from '../components/PreferencesSection'
import type { UseAccounts } from '../hooks/useAccounts'
import { useRemote } from '../hooks/useRemote'

type Props = {
  accounts: UseAccounts
}

export function SettingsPage({ accounts }: Props) {
  const { accounts: states, busy, error, run, closeBrowser } = accounts
  const settings = useRemote(() => window.radar.settings.get())
  const connectable = PLATFORMS.filter((p) => p.connectable)
  const connectedCount = connectable.filter((p) => states.find((s) => s.platformId === p.id)?.status === 'conectado').length

  return (
    <div className="page page--wide">
      <header className="page__header">
        <p className="eyebrow">Configurações</p>
        <h1>Contas conectadas</h1>
        <p className="page__lead">
          Conecte suas contas para o Achadão buscar ofertas e comparar preços em cada plataforma.{' '}
          <strong>
            {connectedCount} de {connectable.length}
          </strong>{' '}
          conectadas.
        </p>
      </header>

      <aside className="notice">
        <Icon name="shield" size={22} />
        <p>
          O login é feito por você, numa janela do Chrome do próprio app. O Achadão <strong>nunca vê nem guarda sua senha</strong>; a
          sessão fica salva só neste computador e pode ser apagada em &quot;Desconectar&quot;. Se um site pedir verificação
          (&quot;não sou um robô&quot;), clique em Conectar/Abrir site e resolva por lá.
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

      {settings.error && <p className="alert" role="alert">{settings.error}</p>}
      {settings.data && (
        <>
          <AiEngineSection settings={settings.data} onChange={(next) => void settings.run(async () => next)} />
          <GeminiSection settings={settings.data} onChange={(next) => void settings.run(async () => next)} />
          <PreferencesSection key={settings.data.geminiModel} settings={settings.data} onChange={(next) => void settings.run(async () => next)} />
        </>
      )}
    </div>
  )
}
