function DespesaConfigModal({
  isOpen,
  form,
  references,
  managedItems = [],
  allowInactivate = false,
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
            <div className="modal-title">Despesa</div>
            <div className="modal-subtitle">Crie, edite ou inative uma despesa existente</div>
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
              {allowInactivate ? <option value="inactivate">Inativar</option> : null}
            </select>
          </div>

          {allowInactivate && form?.mode === 'inactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Despesa</label>
              <select className="modal-input" value={form?.targetNome || ''} onChange={(event) => onChange('targetNome', event.target.value)} disabled={loading}>
                <option value="">Selecione...</option>
                {managedItems
                  .filter((item) => item.ativo)
                  .map((item) => (
                    <option key={`despesa-manage-${item.codigo}`} value={item.nome}>
                      {item.nome}
                    </option>
                ))}
              </select>
            </div>
          ) : form?.mode === 'edit' ? (
            <>
              <div className="modal-field">
                <label className="modal-label">Despesa</label>
                <select className="modal-input" value={form?.targetNome || ''} onChange={(event) => onChange('targetNome', event.target.value)} disabled={loading}>
                  <option value="">Selecione...</option>
                  {managedItems
                    .filter((item) => item.ativo)
                    .map((item) => (
                      <option key={`despesa-edit-${item.codigo}`} value={item.nome}>
                        {item.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-field">
                <label className="modal-label">Novo nome da despesa</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form?.novoNome || ''}
                  onChange={(event) => onChange('novoNome', event.target.value)}
                  placeholder="Ex.: Vale Refeicao"
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
              <div className="modal-field">
                <label className="modal-label">Setor</label>
                <select className="modal-input" value={form?.setor || ''} onChange={(event) => onChange('setor', event.target.value)} disabled={loading}>
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
                  onChange={(event) => onChange('despesa', event.target.value)}
                  placeholder="Ex.: Vale Refeicao"
                  disabled={loading}
                />
              </div>
            </>
          )}

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : allowInactivate && form?.mode === 'inactivate' ? 'Inativar despesa' : form?.mode === 'edit' ? 'Salvar alteracoes' : 'Salvar despesa'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default DespesaConfigModal
