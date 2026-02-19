import { useState } from 'react'
import { formatCurrency, formatDate } from '../../models/pagamentoModel.js'

const QUICK_RANGE_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'mesAnterior', label: 'Mes Anterior' },
  { value: 'anoAtual', label: 'Ano Atual' },
  { value: 'anoPassado', label: 'Ano Passado' },
  { value: 'ultimos30', label: 'Ult. 30 dias' },
]

function FiltersBar({ filters, userLabel, totalValue, onQuickFilter }) {
  const [selectedRange, setSelectedRange] = useState('')
  const totalFormatted = formatCurrency(totalValue)
  const inicio = filters?.de ? formatDate(filters.de) : '--/--/----'
  const fim = filters?.ate ? formatDate(filters.ate) : '--/--/----'
  const periodo = `${inicio} ate ${fim}`

  const handleQuickRangeChange = async (event) => {
    const range = event.target.value
    setSelectedRange(range)
    if (!range) return
    await onQuickFilter?.(range)
    setSelectedRange('')
  }

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
        <span className="filter-quick-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16">
            <path
              fill="currentColor"
              d="M7 2a1 1 0 011 1v1h8V3a1 1 0 112 0v1h1a3 3 0 013 3v12a3 3 0 01-3 3H5a3 3 0 01-3-3V7a3 3 0 013-3h1V3a1 1 0 011-1zm13 9H4v8a1 1 0 001 1h14a1 1 0 001-1v-8zM5 6a1 1 0 00-1 1v2h16V7a1 1 0 00-1-1H5z"
            />
          </svg>
        </span>
        <select className="filter-quick-select" value={selectedRange} onChange={handleQuickRangeChange}>
          <option value="">Selecione um período</option>
          {QUICK_RANGE_OPTIONS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  )
}

export default FiltersBar
