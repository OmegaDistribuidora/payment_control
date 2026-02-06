import { statusOptions } from '../../models/pagamentoModel.js'

function FiltersPanel({
  isOpen,
  filters,
  references,
  onChange,
  onApply,
  onClear,
  onAuthReset,
  loading,
}) {
  if (!isOpen) return null

  return (
    <section className="filters-panel">
      <div className="filters-grid">
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
        <label className="filter-field">
          <span>Sede</span>
          <select value={filters.sede} onChange={(event) => onChange('sede', event.target.value)}>
            <option value="">Todas</option>
            {(references?.sedes || []).map((item) => (
              <option key={`sede-${item.codigo}`} value={item.nome}>
                [{item.codigo}] {item.nome}
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
                [{item.codigo}] {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Despesa</span>
          <select value={filters.despesa} onChange={(event) => onChange('despesa', event.target.value)}>
            <option value="">Todas</option>
            {(references?.despesas || []).map((item) => (
              <option key={`despesa-${item.codigo}`} value={item.nome}>
                [{item.codigo}] {item.nome} - {item.dspCent}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Dotação</span>
          <select value={filters.dotacao} onChange={(event) => onChange('dotacao', event.target.value)}>
            <option value="">Todas</option>
            {(references?.dotacoes || []).map((item) => (
              <option key={`dotacao-${item.codigo}`} value={item.nome}>
                [{item.codigo}] {item.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Status</span>
          <select value={filters.status} onChange={(event) => onChange('status', event.target.value)}>
            <option value="">Todos</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-field">
          <span>Busca</span>
          <input
            type="text"
            placeholder="Buscar por descrição"
            value={filters.q}
            onChange={(event) => onChange('q', event.target.value)}
          />
        </label>
      </div>

      <div className="filters-actions">
        <button className="modal-action ghost" type="button" onClick={onAuthReset}>
          Trocar usuário
        </button>
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
