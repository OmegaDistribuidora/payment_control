import { useMemo } from 'react'
import { formatCurrency, formatDate, formatDateTime } from '../../models/pagamentoModel.js'

function sumBy(items, selector) {
  return Number(items.reduce((sum, item) => sum + Number(selector(item) || 0), 0).toFixed(2))
}

function ReportsPage({
  data,
  loading,
  error,
  selectedSede,
  selectedSetor,
  expenseDetails,
  onSelectSede,
  onSelectSetor,
  onOpenExpenseDetails,
  onCloseExpenseDetails,
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
      <div className="sheet-title">Relatorios</div>

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

      {!loading && !error ? (
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
                      <th className="spreadsheet-head align-center">Ver</th>
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
                            <button
                              type="button"
                              className="spreadsheet-icon-btn edit"
                              title={`Ver lancamentos de ${item.despesa}`}
                              aria-label={`Ver lancamentos de ${item.despesa}`}
                              onClick={() => onOpenExpenseDetails(item.despesa)}
                            >
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
                            </button>
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
                        <td className="spreadsheet-head align-center">-</td>
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
                <div className="modal-title">Lancamentos da despesa</div>
                <div className="modal-subtitle">
                  {expenseDetails.despesa} | {expenseDetails.setor} | {expenseDetails.sede}
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
                              Nenhum lancamento encontrado para esta despesa.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : null}
            </div>

            <footer className="modal-footer">
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
