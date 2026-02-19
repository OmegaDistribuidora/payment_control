import { useEffect, useState } from 'react'

function SetorConfigModal({
  isOpen,
  form,
  loading,
  error,
  onNomeChange,
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
            <div className="modal-title">Novo Setor</div>
            <div className="modal-subtitle">Defina o nome do setor e as despesas permitidas</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Nome do setor</label>
            <input
              className="modal-input"
              type="text"
              value={form?.nome || ''}
              onChange={(event) => onNomeChange(event.target.value)}
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

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar setor'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default SetorConfigModal
