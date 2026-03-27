import { useEffect, useState } from 'react'

function SetorConfigModal({
  isOpen,
  form,
  managedItems = [],
  loading,
  error,
  onChange,
  onAddDespesa,
  onRemoveDespesa,
  onSave,
  onClose,
}) {
  const [despesaInput, setDespesaInput] = useState('')

  useEffect(() => {
    if (!isOpen) return
    setDespesaInput('')
  }, [isOpen])

  if (!isOpen) return null

  const handleAddDespesa = () => {
    const value = despesaInput.trim()
    if (!value) return
    onAddDespesa(value)
    setDespesaInput('')
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-setor">
        <header className="modal-header">
          <div>
            <div className="modal-title">Setor</div>
            <div className="modal-subtitle">Crie, edite ou inative um setor existente</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Acao</label>
            <select
              className="modal-input"
              value={form?.mode || 'create'}
              onChange={(event) => onChange('mode', event.target.value)}
              disabled={loading}
            >
              <option value="create">Criar novo</option>
              <option value="edit">Editar nome</option>
              <option value="inactivate">Inativar</option>
            </select>
          </div>

          {form?.mode === 'inactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Setor</label>
              <select
                className="modal-input"
                value={form?.targetNome || ''}
                onChange={(event) => onChange('targetNome', event.target.value)}
                disabled={loading}
              >
                <option value="">Selecione...</option>
                {managedItems
                  .filter((item) => item.ativo)
                  .map((item) => (
                    <option key={`setor-manage-${item.codigo}`} value={item.nome}>
                      {item.nome}
                    </option>
                  ))}
              </select>
            </div>
          ) : form?.mode === 'edit' ? (
            <>
              <div className="modal-field">
                <label className="modal-label">Setor</label>
                <select
                  className="modal-input"
                  value={form?.targetNome || ''}
                  onChange={(event) => onChange('targetNome', event.target.value)}
                  disabled={loading}
                >
                  <option value="">Selecione...</option>
                  {managedItems
                    .filter((item) => item.ativo)
                    .map((item) => (
                      <option key={`setor-edit-${item.codigo}`} value={item.nome}>
                        {item.nome}
                      </option>
                    ))}
                </select>
              </div>

              <div className="modal-field">
                <label className="modal-label">Novo nome do setor</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form?.novoNome || ''}
                  onChange={(event) => onChange('novoNome', event.target.value)}
                  placeholder="Ex.: Juridico"
                  disabled={loading}
                />
              </div>
            </>
          ) : (
            <>
          <div className="modal-field">
            <label className="modal-label">Nome do setor</label>
            <input
              className="modal-input"
              type="text"
              value={form?.nome || ''}
              onChange={(event) => onChange('nome', event.target.value)}
              placeholder="Ex.: Juridico"
              disabled={loading}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Despesas do setor</label>
            <div className="setor-despesas-add">
              <input
                className="modal-input"
                type="text"
                value={despesaInput}
                onChange={(event) => setDespesaInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddDespesa()
                  }
                }}
                placeholder="Digite uma despesa e clique em Adicionar"
                disabled={loading}
              />
              <button
                className="modal-action ghost"
                type="button"
                onClick={handleAddDespesa}
                disabled={loading || !despesaInput.trim()}
              >
                Adicionar
              </button>
            </div>
            <div className="setor-despesas-list">
              {(form?.despesas || []).length ? (
                (form?.despesas || []).map((item) => (
                  <div key={`setor-despesa-${item}`} className="setor-despesa-item">
                    <span>{item}</span>
                    <button
                      type="button"
                      className="setor-despesa-remove"
                      onClick={() => onRemoveDespesa(item)}
                      disabled={loading}
                      title="Remover despesa"
                    >
                      x
                    </button>
                  </div>
                ))
              ) : (
                <div className="setor-despesa-empty">Nenhuma despesa adicionada.</div>
              )}
            </div>
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
            {loading ? 'Salvando...' : form?.mode === 'inactivate' ? 'Inativar setor' : form?.mode === 'edit' ? 'Salvar alteracoes' : 'Salvar setor'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default SetorConfigModal
