import { formatCurrency, formatDate } from '../../models/pagamentoModel.js'

function RefreshIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5a7 7 0 015.2 2.3V4h2v7h-7V9h4.1A5 5 0 107 12H5a7 7 0 017-7zm7 7a7 7 0 01-11.2 5.7V20H5v-7h7v2H7.9A5 5 0 0017 12h2z"
      />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4 6h16v2l-6 6v4l-4 2v-6L4 8V6z"
      />
    </svg>
  )
}

function FiltersBar({ filters, userLabel, totalSummary, filtersOpen, loading, onReload, onToggleFilters }) {
  const totalFormatted = formatCurrency(totalSummary?.total || 0)
  const totalEmpresaFormatted = formatCurrency(totalSummary?.totalEmpresa || 0)
  const totalFornecedorFormatted = formatCurrency(totalSummary?.totalFornecedor || 0)
  const totalFuncionarioFormatted = formatCurrency(totalSummary?.totalFuncionario || 0)
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
        <div className="filter-split-value">Empresas: {totalEmpresaFormatted || 'R$ --'}</div>
        <div className="filter-split-value">Fornecedores: {totalFornecedorFormatted || 'R$ --'}</div>
        <div className="filter-split-value">Funcionario: {totalFuncionarioFormatted || 'R$ --'}</div>
      </div>
      <div className="filter-tools">
        <button
          className="filter-tool-button"
          type="button"
          onClick={onReload}
          disabled={loading}
          title="Atualizar"
          aria-label="Atualizar"
        >
          <RefreshIcon />
        </button>
        <button
          className={`filter-tool-button filter-tool-toggle${filtersOpen ? ' active' : ''}`}
          type="button"
          onClick={onToggleFilters}
        >
          <FilterIcon />
          <span>{filtersOpen ? 'Ocultar filtros' : 'Mostrar filtros'}</span>
        </button>
      </div>
    </section>
  )
}

export default FiltersBar
