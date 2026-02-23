function DespesaConfigModal({
  isOpen,
  form,
  references,
  loading,
  error,
  onSetorChange,
  onDespesaChange,
  onSave,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-despesa">
        <header className="modal-header">
          <div>
            <div className="modal-title">Criar Despesa</div>
            <div className="modal-subtitle">Adicione uma nova despesa e associe a um setor existente</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Setor</label>
            <select
              className="modal-input"
              value={form?.setor || ''}
              onChange={(event) => onSetorChange(event.target.value)}
              disabled={loading}
            >
              <option value="">Selecione...</option>
              {(references?.setores || []).map((item) => (
                <option key={`despesa-setor-${item.codigo}`} value={item.nome}>
                  {item.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="modal-field">
            <label className="modal-label">Nome da despesa</label>
            <input
              className="modal-input"
              type="text"
              value={form?.despesa || ''}
              onChange={(event) => onDespesaChange(event.target.value)}
              placeholder="Ex.: Vale Refeicao"
              disabled={loading}
            />
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar despesa'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default DespesaConfigModal
