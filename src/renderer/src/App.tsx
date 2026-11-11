import { useEffect, useState, type ReactElement } from 'react'
import { AmbientBackground } from './components/AmbientBackground'
import { Icon, type IconName } from './components/Icon'
import { Logo } from './components/Logo'
import { useAccounts } from './hooks/useAccounts'
import { HistoryPage } from './pages/HistoryPage'
import { HomePage } from './pages/HomePage'
import { OpportunitiesPage } from './pages/OpportunitiesPage'
import { ScanPage } from './pages/ScanPage'
import { SettingsPage } from './pages/SettingsPage'

type PageId = 'inicio' | 'varredura' | 'oportunidades' | 'historico' | 'configuracoes'

const NAV: ReadonlyArray<{ id: PageId; label: string; icon: IconName }> = [
  { id: 'inicio', label: 'Início', icon: 'home' },
  { id: 'varredura', label: 'Varredura', icon: 'scan' },
  { id: 'oportunidades', label: 'Oportunidades', icon: 'tag' },
  { id: 'historico', label: 'Histórico', icon: 'history' },
  { id: 'configuracoes', label: 'Configurações', icon: 'settings' }
]

const isPageId = (value: string): value is PageId => NAV.some((n) => n.id === value)

export function App() {
  const [page, setPage] = useState<PageId>('inicio')
  const [version, setVersion] = useState('')
  const accounts = useAccounts()

  useEffect(() => {
    window.radar.app.version().then(setVersion, () => setVersion(''))
    return window.radar.app.onNavigate((target) => {
      if (isPageId(target)) setPage(target)
    })
  }, [])

  const content = ((): ReactElement => {
    switch (page) {
      case 'inicio':
        return <HomePage accounts={accounts} onNavigate={setPage} />
      case 'varredura':
        return <ScanPage accounts={accounts.accounts} />
      case 'oportunidades':
        return <OpportunitiesPage />
      case 'historico':
        return <HistoryPage />
      case 'configuracoes':
        return <SettingsPage accounts={accounts} />
    }
  })()

  return (
    <div className="shell">
      <AmbientBackground />
      <nav className="sidebar" aria-label="Navegação principal">
        <div className="brand">
          <Logo size={38} />
          <span className="brand__name">
            Achad<b>ão</b>
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
      <main className="content">
        <div key={page} className="page-enter">
          {content}
        </div>
      </main>
    </div>
  )
}
