import { useEffect, useRef, useState } from 'react'

function TopBar({
  currentDate,
  currentMonth,
  onCreate,
  onHistory,
  onConfigSetor,
  onConfigDespesa,
  onConfigUser,
  onChangePassword,
  onOpenReports,
  onToggleView,
  viewMode,
  disableHistory,
  isAuthenticated,
  onAuthAction,
  showSetorButton,
  showDespesaButton,
  showUserButton,
  showReportsButton,
  showHistoryButton,
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [optionsOpen, setOptionsOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) {
      setOptionsOpen(false)
      return undefined
    }

    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false)
        setOptionsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [menuOpen])

  const runMenuAction = (action) => () => {
    setMenuOpen(false)
    setOptionsOpen(false)
    action?.()
  }

  const hasOptions = showDespesaButton || showSetorButton || showUserButton

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
              Novo Lancamento
            </button>
            {showHistoryButton ? (
              <button
                className="topbar-menu-action"
                type="button"
                onClick={runMenuAction(onHistory)}
                disabled={disableHistory}
              >
                Auditoria
              </button>
            ) : null}
            {showReportsButton ? (
              <button className="topbar-menu-action" type="button" onClick={runMenuAction(onOpenReports)}>
                Relatorios
              </button>
            ) : null}
            {hasOptions ? (
              <div className={`topbar-submenu${optionsOpen ? ' is-open' : ''}`}>
                <button
                  className="topbar-menu-action"
                  type="button"
                  onClick={() => setOptionsOpen((prev) => !prev)}
                >
                  Opcoes
                </button>
                {optionsOpen ? (
                  <div className="topbar-submenu-panel">
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
                    {showUserButton ? (
                      <button className="topbar-menu-action" type="button" onClick={runMenuAction(onConfigUser)}>
                        Criar Usuario
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onToggleView)}>
              {viewMode === 'spreadsheet' ? 'Cards' : 'Planilha'}
            </button>
            {isAuthenticated ? (
              <button className="topbar-menu-action" type="button" onClick={runMenuAction(onChangePassword)}>
                Trocar Senha
              </button>
            ) : null}
            <button className="topbar-menu-action" type="button" onClick={runMenuAction(onAuthAction)}>
              {isAuthenticated ? 'Logout' : 'Login'}
            </button>
          </div>
        ) : null}
      </nav>
    </header>
  )
}

export default TopBar
