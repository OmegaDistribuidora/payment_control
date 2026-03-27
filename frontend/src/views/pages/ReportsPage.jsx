import { useMemo } from 'react'
import { formatCurrency, formatDate, formatDateTime } from '../../models/pagamentoModel.js'

function sumBy(items, selector) {
  return Number(items.reduce((sum, item) => sum + Number(selector(item) || 0), 0).toFixed(2))
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M1.5 12s3.8-6 10.5-6 10.5 6 10.5 6-3.8 6-10.5 6S1.5 12 1.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function PrintIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 3h10v4H7V3zm10 9h2v7h-3v2H8v-2H5v-7h2v5h10v-5zm-2 7v-4H9v4h6zm3-10a3 3 0 013 3v3h-2v-3a1 1 0 00-1-1H6a1 1 0 00-1 1v3H3v-3a3 3 0 013-3h12z"
      />
    </svg>
  )
}

function PdfIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 2h8l4 4v14a2 2 0 01-2 2H6a2 2 0 01-2-2V4a2 2 0 012-2zm7 1.5V7h3.5L13 3.5zM8 13h1.8c1.6 0 2.7.9 2.7 2.4S11.4 18 9.8 18H8v-5zm1.4 1.2v2.6h.4c.8 0 1.3-.5 1.3-1.3s-.5-1.3-1.3-1.3h-.4zM13.4 13H17v1.2h-2.2v.8h2v1.2h-2V18h-1.4v-5zm-7.9 0H7c1.3 0 2.2.8 2.2 2s-.9 2-2.2 2H6.9V18H5.5v-5zm1.3 1.2H6.9v1.6h-.1c.6 0 1-.3 1-.8s-.4-.8-1-.8z"
      />
    </svg>
  )
}

function ExcelIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14 2h-4a2 2 0 00-2 2v2H4a2 2 0 00-2 2v8a2 2 0 002 2h4v2a2 2 0 002 2h8a2 2 0 002-2V8l-6-6zm0 2.5L17.5 8H14V4.5zM6.2 9.8h1.6l1 1.7 1-1.7h1.6l-1.7 2.6L11.5 15H9.9l-1.1-1.8L7.7 15H6.1l1.8-2.7-1.7-2.5z"
      />
    </svg>
  )
}

function ReportTimelineChart({ items, granularity }) {
  const maxValue = Math.max(...(items || []).map((item) => Number(item.total || 0)), 0)

  if (!items?.length) {
    return <div className="empty-state">Nenhum dado para gerar grafico neste periodo.</div>
  }

  return (
    <div className="reports-chart-panel">
      <div className="reports-chart-header">
        <div className="reports-column-title">
          Lancado por {granularity === 'day' ? 'dia' : 'mes'}
        </div>
        <div className="reports-node-meta">
          {items.length} pontos no periodo selecionado
        </div>
      </div>
      <div className="reports-chart-wrap">
        <div className="reports-chart">
          {items.map((item) => {
            const height = maxValue > 0 ? Math.max((Number(item.total || 0) / maxValue) * 220, 6) : 6
            return (
              <div key={item.key} className="reports-chart-item" title={`${item.label}: ${formatCurrency(item.total)}`}>
                <div className="reports-chart-value">{formatCurrency(item.total)}</div>
                <div className="reports-chart-bar-track">
                  <div className="reports-chart-bar" style={{ height: `${height}px` }} />
                </div>
                <div className="reports-chart-label">{item.label}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReportsPage({
  data,
  loading,
  error,
  filters,
  periodPreset,
  reportsViewMode,
  reportsTimeline,
  reportsTimelineLoading,
  reportsTimelineError,
  selectedSede,
  selectedSetor,
  expenseDetails,
  onSelectSede,
  onSelectSetor,
  onOpenExpenseDetails,
  onOpenTotalDetails,
  onCloseExpenseDetails,
  onPrintExpenseDetails,
  onExportExpenseDetails,
  onRunReportTotalAction,
  onChangeReportsViewMode,
  onApplyQuickFilter,
}) {
  const sedes = Array.isArray(data?.sedes) ? data.sedes : []
  const arvore = Array.isArray(data?.arvore) ? data.arvore : []

  const setores = useMemo(() => {
    if (!selectedSede) return []
    const grouped = new Map()
    for (const item of arvore) {
      if (item.sede !== selectedSede) continue
      const current = grouped.get(item.setor) || {
        setor: item.setor,
        quantidade: 0,
        total: 0,
        totalEmpresa: 0,
        totalFornecedor: 0,
        totalFuncionario: 0,
      }
      current.quantidade += Number(item.quantidade || 0)
      current.total += Number(item.total || 0)
      current.totalEmpresa += Number(item.totalEmpresa || 0)
      current.totalFornecedor += Number(item.totalFornecedor || 0)
      current.totalFuncionario += Number(item.totalFuncionario || 0)
      grouped.set(item.setor, current)
    }
    return [...grouped.values()].sort((a, b) => b.total - a.total)
  }, [arvore, selectedSede])

  const despesas = useMemo(() => {
    if (!selectedSede || !selectedSetor) return []
    return arvore
      .filter((item) => item.sede === selectedSede && item.setor === selectedSetor)
      .sort((a, b) => Number(b.total || 0) - Number(a.total || 0))
  }, [arvore, selectedSede, selectedSetor])

  return (
    <section className="reports-page">
      <div className="reports-title-row">
        <div className="sheet-title">Relatorios</div>
        <div className="reports-view-toggle">
          <button
            type="button"
            className={`reports-view-btn${reportsViewMode === 'tree' ? ' active' : ''}`}
            onClick={() => onChangeReportsViewMode('tree')}
          >
            Arvore
          </button>
          <button
            type="button"
            className={`reports-view-btn${reportsViewMode === 'chart' ? ' active' : ''}`}
            onClick={() => onChangeReportsViewMode('chart')}
          >
            Graficos
          </button>
        </div>
      </div>

      <div className="reports-summary-grid">
        <div className="report-summary-card">
          <div className="report-summary-label">Total Geral</div>
          <div className="report-summary-value">{formatCurrency(data?.totalGeral || 0)}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Total Empresas</div>
          <div className="report-summary-value">{formatCurrency(data?.totalEmpresa || 0)}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Total Fornecedores</div>
          <div className="report-summary-value">{formatCurrency(data?.totalFornecedor || 0)}</div>
        </div>
        <div className="report-summary-card">
          <div className="report-summary-label">Total Funcionarios</div>
          <div className="report-summary-value">{formatCurrency(data?.totalFuncionario || 0)}</div>
        </div>
      </div>

      {loading ? <div className="loading-hint">Carregando relatorio...</div> : null}
      {error ? <div className="modal-error">{error}</div> : null}

      {!loading && !error && reportsViewMode === 'chart' ? (
        <div className="reports-chart-section">
          <div className="reports-chart-filters">
            {[
              ['hoje', 'Hoje'],
              ['semana', 'Semana'],
              ['mes', 'Mes'],
              ['ultimos30', 'Ult. 30 dias'],
              ['mesAnterior', 'Mes anterior'],
              ['anoAtual', 'Ano atual'],
              ['anoPassado', 'Ano passado'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`reports-view-btn${periodPreset === value ? ' active' : ''}`}
                onClick={() => onApplyQuickFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>

          {reportsTimelineLoading ? <div className="loading-hint">Carregando grafico...</div> : null}
          {reportsTimelineError ? <div className="modal-error">{reportsTimelineError}</div> : null}
          {!reportsTimelineLoading && !reportsTimelineError ? (
            <ReportTimelineChart
              items={reportsTimeline?.items || []}
              granularity={reportsTimeline?.granularity || 'day'}
            />
          ) : null}
        </div>
      ) : null}

      {!loading && !error && reportsViewMode === 'tree' ? (
        <div className="reports-layout">
          <div className="reports-column">
            <div className="reports-column-title">Sedes</div>
            <div className="reports-list">
              {sedes.length ? (
                sedes.map((item) => (
                  <button
                    key={item.sede}
                    type="button"
                    className={`reports-node-card${selectedSede === item.sede ? ' active' : ''}`}
                    onClick={() => {
                      onSelectSede(item.sede)
                      onSelectSetor('')
                    }}
                  >
                    <div className="reports-node-title">{item.sede}</div>
                    <div className="reports-node-value">{formatCurrency(item.total)}</div>
                    <div className="reports-node-meta-grid">
                      <div className="reports-node-meta">Empresas: {formatCurrency(item.totalEmpresa)}</div>
                      <div className="reports-node-meta">Fornecedores: {formatCurrency(item.totalFornecedor)}</div>
                      <div className="reports-node-meta">Funcionario: {formatCurrency(item.totalFuncionario)}</div>
                      <div className="reports-node-meta">{item.quantidade} lancamentos</div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="empty-state">Nenhum dado para o periodo selecionado.</div>
              )}
            </div>
          </div>

          <div className="reports-column">
            <div className="reports-column-title">
              {selectedSede ? `Setores - ${selectedSede}` : 'Selecione uma sede'}
            </div>
            {selectedSede ? (
              <div className="reports-list">
                {setores.length ? (
                  setores.map((item) => (
                    <button
                      key={`${item.setor}-${selectedSede}`}
                      type="button"
                      className={`reports-node-card reports-node-card-secondary${selectedSetor === item.setor ? ' active' : ''}`}
                      onClick={() => onSelectSetor(item.setor)}
                    >
                      <div className="reports-node-title">{item.setor}</div>
                      <div className="reports-node-value">{formatCurrency(item.total)}</div>
                      <div className="reports-node-meta-grid">
                        <div className="reports-node-meta">Empresas: {formatCurrency(item.totalEmpresa)}</div>
                        <div className="reports-node-meta">Fornecedores: {formatCurrency(item.totalFornecedor)}</div>
                        <div className="reports-node-meta">Funcionario: {formatCurrency(item.totalFuncionario)}</div>
                        <div className="reports-node-meta">{item.quantidade} lancamentos</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="empty-state">Nenhum setor encontrado para esta sede.</div>
                )}
              </div>
            ) : (
              <div className="empty-state">Escolha uma sede para ver os setores.</div>
            )}
          </div>

          <div className="reports-column">
            <div className="reports-column-title">
              {selectedSetor ? `Despesas - ${selectedSetor}` : 'Selecione um setor'}
            </div>
            {selectedSetor ? (
              <div className="spreadsheet-wrap reports-despesas-wrap">
                <table className="spreadsheet-table reports-despesas-table">
                  <thead>
                    <tr>
                      <th className="spreadsheet-head align-left">Despesa</th>
                      <th className="spreadsheet-head align-right">Total</th>
                      <th className="spreadsheet-head align-center">Lanc.</th>
                      <th className="spreadsheet-head align-center">Acoes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {despesas.length ? (
                      despesas.map((item) => (
                        <tr key={`${item.sede}-${item.setor}-${item.despesa}`} className="spreadsheet-row">
                          <td className="spreadsheet-cell align-left">{item.despesa}</td>
                          <td className="spreadsheet-cell align-right reports-despesa-total-cell">
                            <div>{formatCurrency(item.total)}</div>
                            <div className="reports-node-meta">Empresas: {formatCurrency(item.totalEmpresa)}</div>
                            <div className="reports-node-meta">Fornecedores: {formatCurrency(item.totalFornecedor)}</div>
                            <div className="reports-node-meta">Funcionario: {formatCurrency(item.totalFuncionario)}</div>
                          </td>
                          <td className="spreadsheet-cell align-center">{item.quantidade}</td>
                          <td className="spreadsheet-cell align-center">
                            <div className="reports-actions">
                              <button
                                type="button"
                                className="spreadsheet-icon-btn edit"
                                title={`Ver lancamentos de ${item.despesa}`}
                                aria-label={`Ver lancamentos de ${item.despesa}`}
                                onClick={() => onOpenExpenseDetails(item.despesa)}
                              >
                                <EyeIcon />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="spreadsheet-cell align-center" colSpan={4}>
                          Nenhuma despesa encontrada para este setor.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {despesas.length ? (
                    <tfoot>
                      <tr>
                        <td className="spreadsheet-head align-left">Total</td>
                        <td className="spreadsheet-head align-right">
                          <div>{formatCurrency(sumBy(despesas, (item) => item.total))}</div>
                          <div className="reports-node-meta">Empresas: {formatCurrency(sumBy(despesas, (item) => item.totalEmpresa))}</div>
                          <div className="reports-node-meta">Fornecedores: {formatCurrency(sumBy(despesas, (item) => item.totalFornecedor))}</div>
                          <div className="reports-node-meta">Funcionario: {formatCurrency(sumBy(despesas, (item) => item.totalFuncionario))}</div>
                        </td>
                        <td className="spreadsheet-head align-center">
                          {despesas.reduce((sum, item) => sum + Number(item.quantidade || 0), 0)}
                        </td>
                        <td className="spreadsheet-head align-center">
                          <div className="reports-actions reports-actions-inline">
                            <button
                              type="button"
                              className="spreadsheet-icon-btn edit"
                              title="Ver todos os lancamentos do total"
                              aria-label="Ver todos os lancamentos do total"
                              onClick={onOpenTotalDetails}
                            >
                              <EyeIcon />
                            </button>
                            <button
                              type="button"
                              className="spreadsheet-icon-btn edit"
                              title="Exportar total em PDF"
                              aria-label="Exportar total em PDF"
                              onClick={() => onRunReportTotalAction('pdf')}
                            >
                              <PdfIcon />
                            </button>
                            <button
                              type="button"
                              className="spreadsheet-icon-btn edit"
                              title="Exportar total em Excel"
                              aria-label="Exportar total em Excel"
                              onClick={() => onRunReportTotalAction('excel')}
                            >
                              <ExcelIcon />
                            </button>
                            <button
                              type="button"
                              className="spreadsheet-icon-btn edit"
                              title="Imprimir total"
                              aria-label="Imprimir total"
                              onClick={() => onRunReportTotalAction('print')}
                            >
                              <PrintIcon />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </tfoot>
                  ) : null}
                </table>
              </div>
            ) : (
              <div className="empty-state">Escolha um setor para ver as despesas.</div>
            )}
          </div>
        </div>
      ) : null}

      {expenseDetails?.open ? (
        <div className="modal-overlay" role="dialog" aria-modal="true">
          <div className="modal modal-history-detail report-expense-modal">
            <header className="modal-header">
              <div>
                <div className="modal-title">{expenseDetails.title || 'Lancamentos do relatorio'}</div>
                <div className="modal-subtitle">
                  {expenseDetails.subtitle || `${expenseDetails.despesa} | ${expenseDetails.setor} | ${expenseDetails.sede}`}
                </div>
              </div>
              <button className="modal-close" type="button" onClick={onCloseExpenseDetails} aria-label="Fechar">
                x
              </button>
            </header>

            <div className="modal-body">
              {expenseDetails.loading ? <div className="loading-hint">Carregando lancamentos...</div> : null}
              {expenseDetails.error ? <div className="modal-error">{expenseDetails.error}</div> : null}
              {!expenseDetails.loading && !expenseDetails.error ? (
                <>
                  <div className="report-expense-summary">
                    {expenseDetails.totalElements} lancamentos encontrados
                  </div>
                  <div className="spreadsheet-wrap report-expense-table-wrap">
                    <table className="spreadsheet-table report-expense-table">
                      <thead>
                        <tr>
                          <th className="spreadsheet-head align-left">Num. Lanc.</th>
                          <th className="spreadsheet-head align-left">Colaborador</th>
                          <th className="spreadsheet-head align-center">Dt Registro</th>
                          <th className="spreadsheet-head align-center">Dt Pagamento</th>
                          <th className="spreadsheet-head align-left">Empresa/Fornecedor</th>
                          <th className="spreadsheet-head align-right">Valor</th>
                          <th className="spreadsheet-head align-left">Descricao</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenseDetails.items.length ? (
                          expenseDetails.items.map((item) => (
                            <tr key={item.id} className="spreadsheet-row">
                              <td className="spreadsheet-cell align-left">{item.codVld || item.id}</td>
                              <td className="spreadsheet-cell align-left">{item.colaborador || item.criadoPor || '-'}</td>
                              <td className="spreadsheet-cell align-center">{formatDateTime(item.dtSistema)}</td>
                              <td className="spreadsheet-cell align-center">{formatDate(item.dtPagamento)}</td>
                              <td className="spreadsheet-cell align-left">{item.empresaFornecedor || '-'}</td>
                              <td className="spreadsheet-cell align-right">{formatCurrency(item.valorTotal)}</td>
                              <td className="spreadsheet-cell align-left">{item.descricao || '-'}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td className="spreadsheet-cell align-center" colSpan={7}>
                              Nenhum lancamento encontrado para este recorte.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            <footer className="modal-footer report-expense-footer">
              <button
                className="modal-action primary"
                type="button"
                onClick={() => onExportExpenseDetails('pdf')}
                disabled={expenseDetails.loading || Boolean(expenseDetails.error)}
              >
                Exportar PDF
              </button>
              <button
                className="modal-action primary"
                type="button"
                onClick={() => onExportExpenseDetails('excel')}
                disabled={expenseDetails.loading || Boolean(expenseDetails.error)}
              >
                Exportar Excel
              </button>
              <button
                className="modal-action primary"
                type="button"
                onClick={onPrintExpenseDetails}
                disabled={expenseDetails.loading || Boolean(expenseDetails.error)}
              >
                Imprimir
              </button>
              <button className="modal-action ghost" type="button" onClick={onCloseExpenseDetails}>
                Fechar
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export default ReportsPage
