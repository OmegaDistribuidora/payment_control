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
            <div className="modal-subtitle">Crie, edite, inative ou reative opcoes</div>
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
              <option value="edit">Editar nome</option>
              <option value="inactivate">Inativar</option>
              <option value="reactivate">Reativar</option>
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
          ) : form?.mode === 'reactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Opcao</label>
              <select className="modal-input" value={form?.targetNome || ''} onChange={(event) => onChange('targetNome', event.target.value)} disabled={loading}>
                <option value="">Selecione...</option>
                {managedItems
                  .filter((item) => !item.ativo)
                  .map((item) => (
                    <option key={`quem-reactivate-${item.codigo}`} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
              </select>
            </div>
          ) : form?.mode === 'edit' ? (
            <>
              <div className="modal-field">
                <label className="modal-label">Opcao</label>
                <select className="modal-input" value={form?.targetNome || ''} onChange={(event) => onChange('targetNome', event.target.value)} disabled={loading}>
                  <option value="">Selecione...</option>
                  {managedItems
                    .filter((item) => item.ativo)
                    .map((item) => (
                      <option key={`quem-edit-${item.codigo}`} value={item.nome}>
                        {item.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-field">
                <label className="modal-label">Novo nome</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form?.novoNome || ''}
                  onChange={(event) => onChange('novoNome', event.target.value)}
                  placeholder="Ex.: Financeiro"
                  disabled={loading}
                />
              </div>
            </>
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
            {loading ? 'Salvando...' : form?.mode === 'inactivate' ? 'Inativar' : form?.mode === 'reactivate' ? 'Reativar' : form?.mode === 'edit' ? 'Salvar alteracoes' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default QuemConfigModal
