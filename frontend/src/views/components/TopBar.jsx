import { useEffect, useRef, useState } from 'react'

function TopBar({
  currentDate,
  currentMonth,
  onCreate,
  onHistory,
  onToggleFilters,
  onConfigSetor,
  onConfigDespesa,
  onToggleView,
  viewMode,
  onReload,
  disableHistory,
  isAuthenticated,
  onAuthAction,
  loading,
  showSetorButton,
  showDespesaButton,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return undefined
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const runMenuAction = (action) => () => {
    setMenuOpen(false)
    action?.()
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-text">
          <div className="brand-title">OMEGA</div>
          <div className="brand-subtitle">DISTRIBUIDORA</div>
        </div>
      </div>

      <div className="topbar-info">
        <div className="info-block">
          <div className="info-label">DATA ATUAL</div>
          <div className="info-value">{currentDate}</div>
        </div>
        <div className="info-block">
          <div className="info-label">MES ATUAL</div>
          <div className="info-value">{currentMonth}</div>
        </div>
      </div>

      <nav className="topbar-actions" ref={menuRef}>
        <button
          className={`topbar-action topbar-menu-trigger${menuOpen ? ' active' : ''}`}
          type="button"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          MENU
        </button>

        {menuOpen ? (
          <div className="topbar-menu" role="menu">
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onCreate)}>
              Lancamento
            </button>
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onToggleFilters)}>
              Filtrar
            </button>
            <button
              className="topbar-menu-action"
              type="button"
              onClick={runMenuAction(onHistory)}
              disabled={disableHistory}
            >
              Historico
            </button>
            {showDespesaButton ? (
              <button className="topbar-menu-action" type="button" onClick={runMenuAction(onConfigDespesa)}>
                Criar Despesa
              </button>
            ) : null}
            {showSetorButton ? (
              <button className="topbar-menu-action" type="button" onClick={runMenuAction(onConfigSetor)}>
                Criar Setor
              </button>
            ) : null}
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onToggleView)}>
              {viewMode === 'spreadsheet' ? 'Cards' : 'Planilha'}
            </button>
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onAuthAction)}>
              {isAuthenticated ? 'Logout' : 'Login'}
            </button>
            <button
              className="topbar-menu-action"
              type="button"
              onClick={runMenuAction(onReload)}
              disabled={loading}
            >
              {loading ? 'Atualizando...' : 'Atualizar'}
            </button>
          </div>
        ) : null}
      </nav>
    </header>
  )
}

export default TopBar
