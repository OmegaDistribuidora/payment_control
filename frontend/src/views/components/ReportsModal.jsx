import { formatCurrency } from '../../models/pagamentoModel.js'

function ReportsModal({ isOpen, data, loading, error, onClose }) {
  if (!isOpen) return null

  const rows = Array.isArray(data?.content) ? data.content : []

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-reports">
        <header className="modal-header">
          <div>
            <div className="modal-title">Relatorios</div>
            <div className="modal-subtitle">Total lancado por sede no periodo selecionado</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          {loading ? <div className="loading-hint">Carregando relatorio...</div> : null}
          {error ? <div className="modal-error">{error}</div> : null}

          {!loading && !error ? (
            <div className="report-list">
              {rows.length ? (
                rows.map((item) => (
                  <div key={item.sede} className="report-card">
                    <div className="report-card-title">{item.sede}</div>
                    <div className="report-card-total">{formatCurrency(item.total)}</div>
                    <div className="report-card-meta">{item.quantidade} lancamentos</div>
                  </div>
                ))
              ) : (
                <div className="empty-state">Nenhum dado para o periodo selecionado.</div>
              )}
            </div>
          ) : null}
        </div>

        <footer className="modal-footer">
          <div className="report-summary">Total geral: {formatCurrency(data?.totalGeral || 0)}</div>
          <button className="modal-action ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ReportsModal
