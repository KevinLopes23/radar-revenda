import { useEffect, useState, type ReactElement } from 'react'
import { Icon, type IconName } from './components/Icon'
import { useAccounts } from './hooks/useAccounts'
import { ComingSoonPage } from './pages/ComingSoonPage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'

type PageId = 'inicio' | 'varredura' | 'oportunidades' | 'historico' | 'configuracoes'

const NAV: ReadonlyArray<{ id: PageId; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'varredura', label: 'Varredura', icon: 'scan' },
  { id: 'oportunidades', label: 'Oportunidades', icon: 'tag' },
  { id: 'historico', label: 'Histórico', icon: 'history' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings' }
]

export function App() {
  const [page, setPage] = useState<PageId>('inicio')
  const [version, setVersion] = useState('')
  const accounts = useAccounts()

  useEffect(() => {
    window.radar.app.version().then(setVersion, () => setVersion(''))
  }, [])

  const content = ((): ReactElement => {
    switch (page) {
      case 'inicio':
        return <HomePage accounts={accounts} onOpenSettings={() => setPage('configuracoes')} />
      case 'configuracoes':
        return <SettingsPage accounts={accounts} />
      case 'varredura':
        return (
          <ComingSoonPage
            stage="Etapa 2"
            title="Varredura"
            description="Buscas salvas por termo, raio e preço máximo, rodando em todas as plataformas conectadas."
          />
        )
      case 'oportunidades':
        return (
          <ComingSoonPage
            stage="Etapas 3 e 4"
            title="Oportunidades"
            description="Anúncios ordenados por lucro, com nota, comparativo de preços e alertas de golpe."
          />
        )
      case 'historico':
        return (
          <ComingSoonPage
            stage="Etapa 5"
            title="Histórico"
            description="O que você comprou, por quanto vendeu e o lucro real de cada negócio."
          />
        )
    }
  })()

  return (
    <div className="shell">
      <nav className="sidebar" aria-label="Navegação principal">
        <div className="brand">
          <span className="brand__mark">
            <Icon name="radar" size={20} />
          </span>
          <span className="brand__name">
            Radar<b>Revenda</b>
          </span>
        </div>
        <ul className="nav">
          {NAV.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav__item${page === item.id ? ' is-active' : ''}`}
                aria-current={page === item.id ? 'page' : undefined}
                onClick={() => setPage(item.id)}
              >
                <Icon name={item.icon} />
                {item.label}
              </button>
            </li>
          ))}
        </ul>
        <p className="sidebar__foot">{version && `v${version}`}</p>
      </nav>
      <main className="content">{content}</main>
    </div>
  )
}
