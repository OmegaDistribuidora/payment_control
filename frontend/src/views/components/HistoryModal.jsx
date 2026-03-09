import { formatDateTime } from '../../models/pagamentoModel.js'

function HistoryModal({
  isOpen,
  selectedDate,
  items,
  loading,
  error,
  onDateChange,
  onApplyDateFilter,
  onClearDateFilter,
  onClose,
}) {
  if (!isOpen) return null

  const rows = Array.isArray(items) ? items : []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-history">
        <header className="modal-header">
          <div>
            <div className="modal-title">Historico Geral</div>
            <div className="modal-subtitle">Ultimas 50 acoes registradas no sistema</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="history-toolbar">
            <label className="modal-field">
              <span className="modal-label">Filtrar por data</span>
              <input
                className="modal-input"
                type="date"
                value={selectedDate || ''}
                onChange={(event) => onDateChange?.(event.target.value)}
              />
            </label>
            <div className="history-toolbar-actions">
              <button
                className="modal-action ghost"
                type="button"
                onClick={onClearDateFilter}
                disabled={loading}
              >
                Limpar
              </button>
              <button
                className="modal-action primary"
                type="button"
                onClick={onApplyDateFilter}
                disabled={loading}
              >
                Aplicar
              </button>
            </div>
          </div>

          {loading ? <div className="loading-hint">Carregando historico...</div> : null}
          {error ? <div className="modal-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="spreadsheet-wrap history-table-wrap">
              <table className="spreadsheet-table history-table">
                <thead>
                  <tr>
                    <th className="spreadsheet-head align-center">Data e hora</th>
                    <th className="spreadsheet-head align-left">Usuario</th>
                    <th className="spreadsheet-head align-left">Entidade</th>
                    <th className="spreadsheet-head align-left">Acao</th>
                    <th className="spreadsheet-head align-left">Referencia</th>
                    <th className="spreadsheet-head align-left">Valor anterior</th>
                    <th className="spreadsheet-head align-left">Valor novo</th>
                    <th className="spreadsheet-head align-left">Descricao</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((item) => (
                      <tr className="spreadsheet-row" key={item.id}>
                        <td className="spreadsheet-cell align-center">{formatDateTime(item.occurredAt)}</td>
                        <td className="spreadsheet-cell align-left">{item.actor || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.entityLabel || item.entityType || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.actionLabel || item.action || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.entityId || '-'}</td>
                        <td className="spreadsheet-cell align-left history-cell-multiline">{item.oldValue || '-'}</td>
                        <td className="spreadsheet-cell align-left history-cell-multiline">{item.newValue || '-'}</td>
                        <td className="spreadsheet-cell align-left history-cell-multiline">{item.description || '-'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="spreadsheet-row">
                      <td className="spreadsheet-cell align-center" colSpan={8}>
                        Nenhum historico encontrado para o filtro informado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

export default HistoryModal
