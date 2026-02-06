import { formatCurrency, formatDate } from '../../models/pagamentoModel.js'

function FiltersBar({ filters, userLabel, totalValue, onQuickFilter }) {
  const totalFormatted = formatCurrency(totalValue)
  const inicio = filters?.de ? formatDate(filters.de) : '--/--/----'
  const fim = filters?.ate ? formatDate(filters.ate) : '--/--/----'

  return (
    <section className="filters">
      <div className="filter-card">
        <div className="filter-label">Per. Inicial</div>
        <div className="filter-value">{inicio}</div>
      </div>
      <div className="filter-card">
        <div className="filter-label">Per. Final</div>
        <div className="filter-value">{fim}</div>
      </div>
      <div className="filter-card">
        <div className="filter-label">Usuário</div>
        <div className="filter-value">{userLabel || '--'}</div>
      </div>
      <div className="filter-card total-card">
        <div className="filter-label">Total Lançado - Período</div>
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
          Mês
        </button>
      </div>
    </section>
  )
}

export default FiltersBar
