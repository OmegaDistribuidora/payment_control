import { formatCurrency, formatDate } from '../../models/pagamentoModel.js'

function FiltersBar({ filters, userLabel, totalValue, onQuickFilter }) {
  const totalFormatted = formatCurrency(totalValue)
  const inicio = filters?.de ? formatDate(filters.de) : '--/--/----'
  const fim = filters?.ate ? formatDate(filters.ate) : '--/--/----'
  const periodo = `${inicio} ate ${fim}`

  return (
    <section className="filters">
      <div className="filter-card">
        <div className="filter-label">Periodo</div>
        <div className="filter-value">{periodo}</div>
      </div>
      <div className="filter-card">
        <div className="filter-label">Usuario</div>
        <div className="filter-value">{userLabel || '--'}</div>
      </div>
      <div className="filter-card total-card">
        <div className="filter-label">Total Lancado - Periodo</div>
        <div className="filter-value">{totalFormatted || 'R$ --'}</div>
      </div>
      <div className="filter-quick">
        <button type="button" onClick={() => onQuickFilter?.('hoje')}>
          Hoje
        </button>
        <button type="button" onClick={() => onQuickFilter?.('semana')}>
          Semana
        </button>
        <button type="button" onClick={() => onQuickFilter?.('mes')}>
          Mes
        </button>
        <button type="button" onClick={() => onQuickFilter?.('ultimos30')}>
          Últ. 30 dias
        </button>
      </div>
    </section>
  )
}

export default FiltersBar
