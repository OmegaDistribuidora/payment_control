import { useMemo } from 'react'

function SetorConfigModal({
  isOpen,
  form,
  despesas,
  loading,
  error,
  onNomeChange,
  onToggleDespesa,
  onSave,
  onClose,
}) {
  const despesasOptions = useMemo(
    () =>
      [...(despesas || [])]
        .filter((item) => item?.nome)
        .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [despesas]
  )

  if (!isOpen) return null

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
            <div className="setor-despesas-list">
              {despesasOptions.map((item) => {
                const checked = Boolean(form?.despesas?.includes(item.nome))
                return (
                  <label key={`setor-despesa-${item.codigo}`} className="setor-despesa-item">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleDespesa(item.nome)}
                      disabled={loading}
                    />
                    <span>{item.nome}</span>
                  </label>
                )
              })}
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

