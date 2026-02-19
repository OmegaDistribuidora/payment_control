import { formatStatusLabel, getColumnValue, sheetColumns } from '../../models/pagamentoModel.js'

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.2 16.6L4.8 12.2l1.4-1.4 3 3 8.6-8.6 1.4 1.4z"
      />
    </svg>
  )
}

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 17.2V21h3.8L18 9.8 14.2 6 3 17.2zm18.7-11.5a1 1 0 000-1.4l-2.5-2.5a1 1 0 00-1.4 0L15.9 3.7l3.8 3.8 2-2z"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 21a2 2 0 01-2-2V7h14v12a2 2 0 01-2 2H7zm11-17h-3.5l-1-1h-3l-1 1H6v2h12V4z"
      />
    </svg>
  )
}

function SpreadsheetTable({ rows, loading, onMarkPaid, onEdit, onDelete }) {
  const hasRows = Array.isArray(rows) && rows.length > 0

  return (
    <section className="sheet sheet-spreadsheet">
      <div className="sheet-title">Planilha de Lancamentos</div>
      {loading ? <div className="loading-hint">Carregando planilha...</div> : null}
      {hasRows ? (
        <div className="spreadsheet-wrap">
          <table className="spreadsheet-table">
            <thead>
              <tr>
                {sheetColumns.map((column) => (
                  <th key={column.key} className={`spreadsheet-head align-${column.align || 'left'}`}>
                    {column.label}
                  </th>
                ))}
                <th className="spreadsheet-head align-center">Status</th>
                <th className="spreadsheet-head align-center">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const pago = row.status === 'PAGO'
                return (
                  <tr key={row.id} className={`spreadsheet-row${pago ? ' is-paid' : ''}`}>
                    {sheetColumns.map((column) => {
                      const value = getColumnValue(row, column)
                      return (
                        <td key={`${row.id}-${column.key}`} className={`spreadsheet-cell align-${column.align || 'left'}`}>
                          {value || '-'}
                        </td>
                      )
                    })}
                    <td className="spreadsheet-cell align-center">{formatStatusLabel(row.status) || '-'}</td>
                    <td className="spreadsheet-cell align-center">
                      <div className="spreadsheet-actions">
                        <button
                          type="button"
                          className="spreadsheet-icon-btn pay"
                          title="Marcar como pago"
                          aria-label="Marcar como pago"
                          disabled={loading || pago}
                          onClick={() => onMarkPaid?.(row)}
                        >
                          <CheckIcon />
                        </button>
                        <button
                          type="button"
                          className="spreadsheet-icon-btn edit"
                          title="Editar"
                          aria-label="Editar"
                          disabled={loading || pago}
                          onClick={() => onEdit?.(row)}
                        >
                          <EditIcon />
                        </button>
                        <button
                          type="button"
                          className="spreadsheet-icon-btn delete"
                          title="Excluir"
                          aria-label="Excluir"
                          disabled={loading || pago}
                          onClick={() => onDelete?.(row)}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">Nenhum lancamento para exibir na planilha.</div>
      )}
    </section>
  )
}

export default SpreadsheetTable
