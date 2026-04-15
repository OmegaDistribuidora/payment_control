function QuemConfigModal({
  isOpen,
  form,
  managedItems = [],
  loading,
  error,
  onChange,
  onSave,
  onClose,
}) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-despesa">
        <header className="modal-header">
          <div>
            <div className="modal-title">Quem?</div>
            <div className="modal-subtitle">Crie novas opcoes ou inative as existentes</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Acao</label>
            <select className="modal-input" value={form?.mode || 'create'} onChange={(event) => onChange('mode', event.target.value)} disabled={loading}>
              <option value="create">Criar novo</option>
              <option value="inactivate">Inativar</option>
            </select>
          </div>

          {form?.mode === 'inactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Opcao</label>
              <select className="modal-input" value={form?.targetNome || ''} onChange={(event) => onChange('targetNome', event.target.value)} disabled={loading}>
                <option value="">Selecione...</option>
                {managedItems
                  .filter((item) => item.ativo)
                  .map((item) => (
                    <option key={`quem-${item.codigo}`} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
              </select>
            </div>
          ) : (
            <div className="modal-field">
              <label className="modal-label">Nome</label>
              <input
                className="modal-input"
                type="text"
                value={form?.nome || ''}
                onChange={(event) => onChange('nome', event.target.value)}
                placeholder="Ex.: RH"
                disabled={loading}
              />
            </div>
          )}

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : form?.mode === 'inactivate' ? 'Inativar' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default QuemConfigModal
