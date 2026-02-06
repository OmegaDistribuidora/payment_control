import { memo } from 'react'
import { formatDate, formatStatusLabel, getColumnValue, sheetColumns } from '../../models/pagamentoModel.js'

const HEADER_KEYS = new Set(['id', 'codVld', 'valor'])

function SheetTable({ rows, selectedId, onSelect, loading }) {
  const hasRows = rows && rows.length > 0
  const showSkeleton = loading && !hasRows
  const valorColumn = sheetColumns.find((column) => column.key === 'valor')
  const bodyColumns = sheetColumns.filter((column) => !HEADER_KEYS.has(column.key))
  const summaryKeys = new Set(['colaborador', 'sede', 'dtVencimento', 'setor', 'setorPagamento', 'despesa'])
  const summaryColumns = bodyColumns.filter((column) => summaryKeys.has(column.key))

  return (
    <section className="sheet">
      <div className="sheet-title">Lançamentos</div>
      {showSkeleton ? (
        <div className="cards-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <article className="payment-card card-skeleton" key={`skeleton-${index}`}>
              <div className="skeleton-line w-70" />
              <div className="skeleton-line w-40" />
              <div className="skeleton-row">
                <span className="skeleton-pill" />
                <span className="skeleton-line w-30" />
              </div>
              <div className="skeleton-line w-90" />
              <div className="skeleton-line w-60" />
            </article>
          ))}
        </div>
      ) : hasRows ? (
        <div className="cards-grid">
          {rows.map((row) => {
            const isSelected = row.id === selectedId
            const valor = valorColumn ? getColumnValue(row, valorColumn) : ''
            const columnsToRender = isSelected ? bodyColumns : summaryColumns
            const setor = getColumnValue(row, { key: 'setor' })
            const despesa = getColumnValue(row, { key: 'despesa' })
            const sede = getColumnValue(row, { key: 'sede' })
            const vencimento = formatDate(row.dtVencimento)
            const lancamento = formatDate(row.dtPagamento)
            const quem = getColumnValue(row, { key: 'setorPagamento' })

            return (
              <article
                key={row.id}
                className={`payment-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelect(row.id)}
              >
                <header className="card-header">
                  <div>
                    <div className="card-title">Num. Lanc. {row.codVld || '-'}</div>
                    <div className="card-subtitle">Codigo {row.id ?? '-'}</div>
                  </div>
                  <div className="card-meta">
                    {row.status ? (
                      <span className={`status-pill status-${row.status.toLowerCase()}`}>
                        {formatStatusLabel(row.status)}
                      </span>
                    ) : null}
                    <div className="card-amount">{valor}</div>
                  </div>
                </header>
                {isSelected ? (
                  <div className="card-body">
                    {columnsToRender.map((column) => {
                      const value = getColumnValue(row, column)
                      if (value === '' || value === null || value === undefined) {
                        return null
                      }

                      return (
                        <div className="card-field" key={`${row.id}-${column.key}`}>
                          <span className="card-label">{column.label}</span>
                          <span className="card-value">{value}</span>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="card-summary">
                    <div className="card-mainline">{[setor, despesa].filter(Boolean).join(' • ') || '-'}</div>
                    <div className="card-secondary">
                      {[
                        sede,
                        lancamento ? `Lanç.: ${lancamento}` : '',
                        vencimento ? `Venc.: ${vencimento}` : '',
                        quem,
                      ]
                        .filter(Boolean)
                        .join(' | ') || 'Sem detalhes adicionais'}
                    </div>
                    <div className="card-hint">Clique para ver mais detalhes</div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      ) : (
        <div className="empty-state">Nenhum registro</div>
      )}
    </section>
  )
}

export default memo(SheetTable)
