function TopBar({
  currentDate,
  currentMonth,
  onCreate,
  onHistory,
  onToggleFilters,
  onReload,
  disableHistory,
  isAuthenticated,
  onAuthAction,
  loading,
}) {
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

      <nav className="topbar-actions">
        <button className="topbar-action" type="button" onClick={onCreate}>
          Lancamento
        </button>
        <button className="topbar-action" type="button" onClick={onHistory} disabled={disableHistory}>
          Historico
        </button>
        <button className="topbar-action" type="button" onClick={onToggleFilters}>
          Filtrar
        </button>
        <button className="topbar-action topbar-action-auth" type="button" onClick={onAuthAction}>
          {isAuthenticated ? 'Logout' : 'Login'}
        </button>
        <button className="topbar-action" type="button" onClick={onReload} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </nav>
    </header>
  )
}

export default TopBar
