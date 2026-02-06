function TopBar({
  currentDate,
  currentMonth,
  onCreate,
  onEdit,
  onHistory,
  onToggleFilters,
  onReload,
  disableEdit,
  disableHistory,
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
          <div className="info-label">MÊS ATUAL</div>
            <div className="info-value">{currentMonth}</div>
        </div>
      </div>

      <nav className="topbar-actions">
        <button className="topbar-action" type="button" onClick={onCreate}>
          Lançamento
        </button>
        <button className="topbar-action" type="button" onClick={onEdit} disabled={disableEdit}>
          Editar
        </button>
        <button className="topbar-action" type="button" onClick={onHistory} disabled={disableHistory}>
          Histórico
        </button>
        <button className="topbar-action" type="button" onClick={onToggleFilters}>
          Filtrar
        </button>
        <button className="topbar-action" type="button" onClick={onReload} disabled={loading}>
          {loading ? 'Atualizando...' : 'Atualizar'}
        </button>
      </nav>
    </header>
  )
}

export default TopBar
