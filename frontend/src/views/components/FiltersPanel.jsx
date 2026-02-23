const PT_BR_SORTER = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

const PERIOD_OPTIONS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Semana' },
  { value: 'mes', label: 'Mes' },
  { value: 'mesAnterior', label: 'Mes Anterior' },
  { value: 'anoAtual', label: 'Ano Atual' },
  { value: 'anoPassado', label: 'Ano Passado' },
  { value: 'ultimos30', label: 'Ult. 30 dias' },
  { value: 'personalizado', label: 'Personalizado' },
]

function FiltersPanel({
  isOpen,
  periodPreset,
  filters,
  references,
  onChange,
  onPeriodChange,
  onApply,
  onClear,
  loading,
}) {
  if (!isOpen) return null

  const despesasOrdenadas = [...(references?.despesas || [])].sort((a, b) =>
    PT_BR_SORTER.compare(a?.nome || '', b?.nome || '')
  )
  const showCustomDateFields = periodPreset === 'personalizado'

  return (
    <section className="filters-panel">
      <div className="filters-grid">
        <label className="filter-field">
          <span>Periodo</span>
          <select value={periodPreset} onChange={(event) => onPeriodChange(event.target.value)}>
            {PERIOD_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        {showCustomDateFields ? (
          <>
            <label className="filter-field">
              <span>Data inicial</span>
              <input
                type="date"
                value={filters.de}
                onChange={(event) => onChange('de', event.target.value)}
              />
            </label>
            <label className="filter-field">
              <span>Data final</span>
              <input
                type="date"
                value={filters.ate}
                onChange={(event) => onChange('ate', event.target.value)}
              />
            </label>
          </>
        ) : null}

        <label className="filter-field">
          <span>Sede</span>
          <select value={filters.sede} onChange={(event) => onChange('sede', event.target.value)}>
            <option value="">Todas</option>
            {(references?.sedes || []).map((item) => (
              <option key={`sede-${item.codigo}`} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Setor</span>
          <select value={filters.setor} onChange={(event) => onChange('setor', event.target.value)}>
            <option value="">Todos</option>
            {(references?.setores || []).map((item) => (
              <option key={`setor-${item.codigo}`} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Despesa</span>
          <select value={filters.despesa} onChange={(event) => onChange('despesa', event.target.value)}>
            <option value="">Todas</option>
            {despesasOrdenadas.map((item) => (
              <option key={`despesa-${item.codigo}`} value={item.nome}>
                {item.nome} - {item.dspCent}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Dotacao</span>
          <select value={filters.dotacao} onChange={(event) => onChange('dotacao', event.target.value)}>
            <option value="">Todas</option>
            {(references?.dotacoes || []).map((item) => (
              <option key={`dotacao-${item.codigo}`} value={item.nome}>
                {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Busca</span>
          <input
            type="text"
            placeholder="Buscar por descricao"
            value={filters.q}
            onChange={(event) => onChange('q', event.target.value)}
          />
        </label>
      </div>

      <div className="filters-actions">
        <button className="modal-action ghost" type="button" onClick={onClear}>
          Limpar
        </button>
        <button className="modal-action primary" type="button" disabled={loading} onClick={onApply}>
          {loading ? 'Carregando...' : 'Aplicar filtros'}
        </button>
      </div>
    </section>
  )
}

export default FiltersPanel
