function ExportModal({
  isOpen,
  form,
  references,
  loading,
  error,
  onChange,
  onExportPdf,
  onExportExcel,
  onClose,
}) {
  if (!isOpen) return null

  const despesasDisponiveis = form?.setor
    ? references?.setorDespesas?.[form.setor] || []
    : references?.despesas?.map((item) => item.nome) || []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-export">
        <header className="modal-header">
          <div>
            <div className="modal-title">Exportar</div>
            <div className="modal-subtitle">Selecione os filtros e exporte os lancamentos em PDF ou Excel</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="filters-grid">
            <label className="filter-field">
              <span>Periodo</span>
              <select className="modal-input" value={form?.periodPreset || 'mes'} onChange={(event) => onChange('periodPreset', event.target.value)} disabled={loading}>
                <option value="hoje">Hoje</option>
                <option value="semana">Semana</option>
                <option value="mes">Mes Atual</option>
                <option value="mesAnterior">Mes Anterior</option>
                <option value="ultimos30">Ult. 30 dias</option>
                <option value="anoAtual">Ano Atual</option>
                <option value="anoPassado">Ano Passado</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </label>

            <label className="filter-field">
              <span>Data Inicial</span>
              <input className="modal-input" type="date" value={form?.de || ''} onChange={(event) => onChange('de', event.target.value)} disabled={loading} />
            </label>

            <label className="filter-field">
              <span>Data Final</span>
              <input className="modal-input" type="date" value={form?.ate || ''} onChange={(event) => onChange('ate', event.target.value)} disabled={loading} />
            </label>

            <label className="filter-field">
              <span>Sede</span>
              <select className="modal-input" value={form?.sede || ''} onChange={(event) => onChange('sede', event.target.value)} disabled={loading}>
                <option value="">Todas</option>
                {(references?.sedes || []).map((item) => (
                  <option key={`export-sede-${item.codigo}`} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Setor</span>
              <select className="modal-input" value={form?.setor || ''} onChange={(event) => onChange('setor', event.target.value)} disabled={loading}>
                <option value="">Todos</option>
                {(references?.setores || []).map((item) => (
                  <option key={`export-setor-${item.codigo}`} value={item.nome}>
                    {item.nome}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>Despesa</span>
              <select className="modal-input" value={form?.despesa || ''} onChange={(event) => onChange('despesa', event.target.value)} disabled={loading}>
                <option value="">Todas</option>
                {despesasDisponiveis.map((item) => (
                  <option key={`export-despesa-${item}`} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action ghost" type="button" onClick={onExportExcel} disabled={loading}>
            {loading ? 'Exportando...' : 'Excel'}
          </button>
          <button className="modal-action primary" type="button" onClick={onExportPdf} disabled={loading}>
            {loading ? 'Exportando...' : 'PDF'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ExportModal
