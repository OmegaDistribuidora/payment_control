import { useEffect, useState } from 'react'
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
  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    if (!isOpen) {
      setSelectedItem(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const rows = Array.isArray(items) ? items : []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-history">
        <header className="modal-header">
          <div>
            <div className="modal-title">Auditoria</div>
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

          {loading ? <div className="loading-hint">Carregando auditoria...</div> : null}
          {error ? <div className="modal-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="spreadsheet-wrap history-table-wrap">
              <table className="spreadsheet-table history-table">
                <thead>
                  <tr>
                    <th className="spreadsheet-head align-center">Data e hora</th>
                    <th className="spreadsheet-head align-left">Usuario</th>
                    <th className="spreadsheet-head align-left">Acao</th>
                    <th className="spreadsheet-head align-left">Lancamento</th>
                    <th className="spreadsheet-head align-right">Valor</th>
                    <th className="spreadsheet-head align-left">Setor</th>
                    <th className="spreadsheet-head align-left">Despesa</th>
                    <th className="spreadsheet-head align-center">Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length ? (
                    rows.map((item) => (
                      <tr className="spreadsheet-row" key={item.id}>
                        <td className="spreadsheet-cell align-center">{formatDateTime(item.occurredAt)}</td>
                        <td className="spreadsheet-cell align-left">{item.actor || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.actionLabel || item.action || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.lancamento || '-'}</td>
                        <td className="spreadsheet-cell align-right">{item.valor || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.setor || '-'}</td>
                        <td className="spreadsheet-cell align-left">{item.despesa || '-'}</td>
                        <td className="spreadsheet-cell align-center">
                          <button
                            className="spreadsheet-icon-btn"
                            type="button"
                            title="Ver detalhes"
                            aria-label="Ver detalhes"
                            onClick={() => setSelectedItem(item)}
                          >
                            <svg
                              aria-hidden="true"
                              width="16"
                              height="16"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr className="spreadsheet-row">
                      <td className="spreadsheet-cell align-center" colSpan={8}>
                        Nenhum registro encontrado para o filtro informado.
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

        {selectedItem ? (
          <div className="modal-overlay history-detail-overlay" role="dialog" aria-modal="true">
            <div className="modal modal-history-detail">
              <header className="modal-header">
                <div>
                  <div className="modal-title">Detalhes da Auditoria</div>
                  <div className="modal-subtitle">
                    {selectedItem.actionLabel || selectedItem.action || '-'} ·{' '}
                    {formatDateTime(selectedItem.occurredAt)}
                  </div>
                </div>
                <button
                  className="modal-close"
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  aria-label="Fechar detalhes"
                >
                  x
                </button>
              </header>

              <div className="modal-body">
                <div className="history-detail-grid">
                  <div className="history-detail-card">
                    <div className="history-detail-label">Usuario</div>
                    <div className="history-detail-value">{selectedItem.actor || '-'}</div>
                  </div>
                  <div className="history-detail-card">
                    <div className="history-detail-label">Entidade</div>
                    <div className="history-detail-value">{selectedItem.entityLabel || '-'}</div>
                  </div>
                  <div className="history-detail-card">
                    <div className="history-detail-label">Lancamento</div>
                    <div className="history-detail-value">{selectedItem.lancamento || '-'}</div>
                  </div>
                  <div className="history-detail-card">
                    <div className="history-detail-label">Descricao</div>
                    <div className="history-detail-value">{selectedItem.description || '-'}</div>
                  </div>
                </div>

                <div className="history-detail-columns">
                  <div className="history-detail-panel">
                    <div className="history-detail-panel-title">Valor anterior</div>
                    <pre className="history-detail-text">{selectedItem.oldValue || '-'}</pre>
                  </div>
                  <div className="history-detail-panel">
                    <div className="history-detail-panel-title">Valor novo</div>
                    <pre className="history-detail-text">{selectedItem.newValue || '-'}</pre>
                  </div>
                </div>
              </div>

              <footer className="modal-footer">
                <button className="modal-action ghost" type="button" onClick={() => setSelectedItem(null)}>
                  Fechar detalhes
                </button>
              </footer>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default HistoryModal
