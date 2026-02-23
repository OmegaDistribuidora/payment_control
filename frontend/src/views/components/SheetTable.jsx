import { memo } from 'react'
import { formatDate, getColumnValue, sheetColumns } from '../../models/pagamentoModel.js'

const HEADER_KEYS = new Set(['codVld', 'valor'])
const EXTRA_KEYS = new Set(['empresaFornecedor', 'descricao', 'criadoPor'])

function SheetTable({ rows, selectedId, onSelect, onEdit, onDelete, loading }) {
  const hasRows = rows && rows.length > 0
  const showSkeleton = loading && !hasRows
  const valorColumn = sheetColumns.find((column) => column.key === 'valor')
  const bodyColumns = sheetColumns.filter((column) => !HEADER_KEYS.has(column.key))
  const detailColumns = bodyColumns.filter((column) => !EXTRA_KEYS.has(column.key))
  const summaryKeys = new Set(['colaborador', 'sede', 'dtVencimento', 'setor', 'setorPagamento', 'despesa'])
  const summaryColumns = bodyColumns.filter((column) => summaryKeys.has(column.key))

  return (
    <section className="sheet">
      <div className="sheet-title">Lancamentos</div>
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
            const columnsToRender = isSelected ? detailColumns : summaryColumns
            const setor = getColumnValue(row, { key: 'setor' })
            const despesa = getColumnValue(row, { key: 'despesa' })
            const sede = getColumnValue(row, { key: 'sede' })
            const vencimento = formatDate(row.dtVencimento)
            const quem = getColumnValue(row, { key: 'setorPagamento' })
            const empresaFornecedor = getColumnValue(row, { key: 'empresaFornecedor' }) || '-'
            const descricao = getColumnValue(row, { key: 'descricao' }) || '-'
            const criadoPor = getColumnValue(row, { key: 'criadoPor' }) || '-'

            return (
              <article
                key={row.id}
                className={`payment-card${isSelected ? ' is-selected' : ''}`}
                onClick={() => onSelect(row.id)}
              >
                <header className="card-header">
                  <div>
                    <div className="card-title">Lancamento {row.codVld || '-'}</div>
                  </div>
                  <div className="card-meta">
                    <div className="card-amount">{valor}</div>
                  </div>
                </header>
                {isSelected ? (
                  <>
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
                    <div className="card-notes">
                      <div className="card-field card-field-full">
                        <span className="card-label">Empresa/Fornecedor</span>
                        <span className="card-value">{empresaFornecedor}</span>
                      </div>
                      <div className="card-field card-field-full">
                        <span className="card-label">Descricao</span>
                        <span className="card-value">{descricao}</span>
                      </div>
                      <div className="card-field card-field-full">
                        <span className="card-label">Login do lancamento</span>
                        <span className="card-value">{criadoPor}</span>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        className="modal-action primary"
                        type="button"
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation()
                          onEdit?.(row)
                        }}
                      >
                        Editar
                      </button>
                      <button
                        className="modal-action danger"
                        type="button"
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation()
                          onDelete?.(row)
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="card-summary">
                    <div className="card-mainline">{[setor, despesa].filter(Boolean).join(' - ') || '-'}</div>
                    <div className="card-secondary">
                      {[
                        sede,
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
