import { useCallback } from 'react'
import { usePagamentosController } from '../../controllers/pagamentosController.js'
import FiltersBar from '../components/FiltersBar.jsx'
import FiltersPanel from '../components/FiltersPanel.jsx'
import NewPaymentModal from '../components/NewPaymentModal.jsx'
import HistoryModal from '../components/HistoryModal.jsx'
import SheetTable from '../components/SheetTable.jsx'
import SpreadsheetTable from '../components/SpreadsheetTable.jsx'
import TopBar from '../components/TopBar.jsx'
import AuthModal from '../components/AuthModal.jsx'
import SetorConfigModal from '../components/SetorConfigModal.jsx'
import DespesaConfigModal from '../components/DespesaConfigModal.jsx'
import UserConfigModal from '../components/UserConfigModal.jsx'
import ChangePasswordModal from '../components/ChangePasswordModal.jsx'
import EntityConfigModal from '../components/EntityConfigModal.jsx'
import ExportModal from '../components/ExportModal.jsx'
import ReportsPage from './ReportsPage.jsx'
import { formatCurrency, formatDate, formatDateTime, formatMonth } from '../../models/pagamentoModel.js'
import '../../styles/payments.css'

function PagamentosPage() {
  const controller = usePagamentosController()
  const today = new Date()

  const handleSelect = useCallback(
    (id) => controller.setSelectedId(controller.selectedId === id ? null : id),
    [controller.selectedId, controller.setSelectedId]
  )

  const handleAuthAction = useCallback(() => {
    if (controller.auth) {
      controller.handleAuthClear()
      return
    }
    controller.setAuthModalOpen(true)
  }, [controller.auth, controller.handleAuthClear, controller.setAuthModalOpen])

  const handleEditRow = useCallback(
    async (row) => {
      await controller.openEditModal(row)
    },
    [controller.openEditModal]
  )

  const handleDeleteRow = useCallback(
    async (row) => {
      if (!row) return
      const confirmed = window.confirm('Confirma a exclusao deste lancamento?')
      if (!confirmed) return
      await controller.removePagamento(row)
    },
    [controller.removePagamento]
  )

  const handleReload = useCallback(async () => {
    if (controller.currentPage === 'reports') {
      await controller.openReportsPage()
      return
    }
    await controller.fetchPagamentos({ pageNumber: controller.pageInfo.number, skipCache: true })
    if (controller.viewMode === 'spreadsheet') {
      await controller.fetchSpreadsheetRows()
    }
  }, [
    controller.currentPage,
    controller.fetchPagamentos,
    controller.fetchSpreadsheetRows,
    controller.openReportsPage,
    controller.pageInfo.number,
    controller.viewMode,
  ])

  const handlePrint = useCallback(() => {
    const rows = controller.viewMode === 'spreadsheet' ? controller.spreadsheetRows : controller.pagamentos
    const periodoInicio = controller.filters?.de ? formatDate(controller.filters.de) : '--/--/----'
    const periodoFim = controller.filters?.ate ? formatDate(controller.filters.ate) : '--/--/----'
    const popup = window.open('', '_blank', 'width=1200,height=800')
    if (!popup) return

    const rowsHtml = (rows || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.codVld || item.id || '-')}</td>
            <td>${escapeHtml(item.colaborador || item.criadoPor || '-')}</td>
            <td>${escapeHtml(item.sede || '-')}</td>
            <td>${escapeHtml(formatDateTime(item.dtSistema) || '-')}</td>
            <td>${escapeHtml(formatDate(item.dtPagamento) || '-')}</td>
            <td>${escapeHtml(formatDate(item.dtVencimento) || '-')}</td>
            <td>${escapeHtml(item.setor || '-')}</td>
            <td>${escapeHtml(item.despesa || '-')}</td>
            <td>${escapeHtml(item.setorPagamento || '-')}</td>
            <td>${escapeHtml(item.dotacao || '-')}</td>
            <td>${escapeHtml(item.empresaFornecedor || '-')}</td>
            <td class="align-right">${escapeHtml(formatCurrency(item.valorTotal) || '-')}</td>
            <td>${escapeHtml(item.descricao || '-')}</td>
          </tr>
        `
      )
      .join('')

    popup.document.write(`
      <!doctype html>
      <html lang="pt-BR">
        <head>
          <meta charset="utf-8" />
          <title>Impressao de lancamentos</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #102133; }
            h1 { font-size: 20px; margin: 0 0 8px; }
            .meta { margin: 0 0 18px; font-size: 13px; color: #4b5d70; display: grid; gap: 4px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #d7e1ea; padding: 7px 8px; vertical-align: top; }
            th { background: #eef4fb; text-align: left; }
            .align-right { text-align: right; }
          </style>
        </head>
        <body>
          <h1>Lancamentos visiveis</h1>
          <div class="meta">
            <div><strong>Visualizacao:</strong> ${escapeHtml(controller.viewMode === 'spreadsheet' ? 'Planilha' : 'Cards')}</div>
            <div><strong>Periodo:</strong> ${escapeHtml(`${periodoInicio} ate ${periodoFim}`)}</div>
            <div><strong>Usuario logado:</strong> ${escapeHtml(controller.auth?.username || '-')}</div>
            <div><strong>Quantidade:</strong> ${escapeHtml(String(rows.length || 0))}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Num. Lanc.</th>
                <th>Colaborador</th>
                <th>Sede</th>
                <th>Dt Registro</th>
                <th>Dt Pagamento</th>
                <th>Dt Vencimento</th>
                <th>Setor</th>
                <th>Despesa</th>
                <th>Quem?</th>
                <th>Dotacao</th>
                <th>Empresa/Fornecedor</th>
                <th>Valor</th>
                <th>Descricao</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml || '<tr><td colspan="13">Nenhum lancamento visivel.</td></tr>'}
            </tbody>
          </table>
        </body>
      </html>
    `)
    popup.document.close()
    popup.focus()
    popup.print()
  }, [
    controller.auth?.username,
    controller.filters?.ate,
    controller.filters?.de,
    controller.pagamentos,
    controller.spreadsheetRows,
    controller.viewMode,
  ])

  const handleExportPdf = useCallback(async () => {
    await controller.exportPagamentos('pdf')
  }, [controller.exportPagamentos])

  const handleExportExcel = useCallback(async () => {
    await controller.exportPagamentos('excel')
  }, [controller.exportPagamentos])

  return (
    <div className="app">
      <TopBar
        currentDate={formatDate(today)}
        currentMonth={formatMonth(today)}
        currentPage={controller.currentPage}
        onCreate={controller.openCreateModal}
        onHistory={controller.openHistoryModal}
        onConfigSetor={controller.openSetorModal}
        onConfigDespesa={controller.openDespesaModal}
        onConfigUser={controller.openUserModal}
        onConfigEntity={controller.openEntityModal}
        onOpenExport={controller.openExportModal}
        onChangePassword={controller.openPasswordModal}
        onOpenReports={controller.openReportsPage}
        onOpenPayments={controller.openPaymentsPage}
        disableHistory={false}
        isAuthenticated={Boolean(controller.auth)}
        onAuthAction={handleAuthAction}
        showSetorButton={controller.canCreateSetor}
        showDespesaButton={controller.canCreateDespesa}
        showUserButton={controller.canCreateUser}
        showEntityButton={controller.canManageEntities}
        showExportButton={controller.isAdmin}
        showReportsButton={controller.canViewReports}
        showHistoryButton={controller.canViewHistory}
      />
      <FiltersBar
        filters={controller.filters}
        userLabel={controller.auth?.username}
        totalSummary={controller.totalSummary}
        filtersOpen={controller.isFiltersOpen}
        loading={controller.loading}
        viewMode={controller.viewMode}
        showViewToggle={controller.currentPage === 'payments'}
        onReload={handleReload}
        onPrint={handlePrint}
        onToggleView={controller.toggleViewMode}
        onToggleFilters={controller.toggleFilters}
      />
      <FiltersPanel
        isOpen={controller.isFiltersOpen}
        periodPreset={controller.periodPreset}
        filters={controller.filters}
        references={controller.references}
        onChange={controller.updateFilters}
        onPeriodChange={controller.applyQuickFilter}
        onApply={controller.applyFilters}
        onClear={controller.clearFilters}
        loading={controller.loading}
      />
      {controller.error ? <div className="page-error">{controller.error}</div> : null}
      {controller.loading ? <div className="loading-hint">Carregando dados...</div> : null}
      {controller.currentPage === 'reports' ? (
        <ReportsPage
          data={controller.reportsData}
          loading={controller.reportsLoading}
          error={controller.reportsError}
          filters={controller.filters}
          periodPreset={controller.periodPreset}
          reportsViewMode={controller.reportsViewMode}
          reportsTimeline={controller.reportsTimeline}
          reportsTimelineLoading={controller.reportsTimelineLoading}
          reportsTimelineError={controller.reportsTimelineError}
          selectedSede={controller.selectedReportSede}
          selectedSetor={controller.selectedReportSetor}
          expenseDetails={controller.reportExpenseDetails}
          onSelectSede={controller.setSelectedReportSede}
          onSelectSetor={controller.setSelectedReportSetor}
          onOpenExpenseDetails={controller.openReportExpenseDetails}
          onOpenTotalDetails={controller.openReportTotalDetails}
          onCloseExpenseDetails={controller.closeReportExpenseDetails}
          onPrintExpenseDetails={controller.printCurrentReportDetails}
          onExportExpenseDetails={controller.exportCurrentReportDetails}
          onRunReportTotalAction={controller.runReportTotalAction}
          onChangeReportsViewMode={controller.changeReportsViewMode}
          onApplyQuickFilter={controller.applyQuickFilter}
        />
      ) : controller.viewMode === 'cards' ? (
        <>
          <SheetTable
            rows={controller.pagamentos}
            selectedId={controller.selectedId}
            loading={controller.loading}
            onSelect={handleSelect}
            onEdit={handleEditRow}
            onDelete={handleDeleteRow}
          />
          <div className="sheet-footer">
            <div>
              {controller.pageInfo.totalElements
                ? `${controller.pageInfo.totalElements} registros`
                : 'Nenhum registro'}
            </div>
            <div className="sheet-pagination">
              <button
                className="modal-action ghost"
                type="button"
                onClick={controller.goPrevPage}
                disabled={!controller.canPaginatePrev || controller.loading}
              >
                Anterior
              </button>
              <span>
                Pagina {controller.pageInfo.number + 1} de {controller.pageInfo.totalPages || 1}
              </span>
              <button
                className="modal-action ghost"
                type="button"
                onClick={controller.goNextPage}
                disabled={!controller.canPaginateNext || controller.loading}
              >
                Proxima
              </button>
            </div>
          </div>
        </>
      ) : (
        <SpreadsheetTable
          rows={controller.spreadsheetRows}
          loading={controller.spreadsheetLoading || controller.loading}
          visibleCount={controller.spreadsheetRows.length}
          totalCount={controller.spreadsheetInfo.totalElements}
          canLoadMore={controller.canLoadMoreSpreadsheetRows}
          onLoadMore={controller.loadMoreSpreadsheetRows}
          onEdit={handleEditRow}
          onDelete={handleDeleteRow}
        />
      )}
      <NewPaymentModal
        isOpen={controller.modal.open}
        mode={controller.modal.mode}
        form={controller.form}
        references={controller.references}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateForm}
        onSave={controller.savePagamento}
        onClose={controller.closeModal}
        onDelete={controller.removePagamento}
      />
      <HistoryModal
        isOpen={controller.historyModalOpen}
        selectedDate={controller.historyDate}
        items={controller.historyItems}
        loading={controller.historyLoading}
        error={controller.historyError}
        onDateChange={controller.updateHistoryDate}
        onApplyDateFilter={controller.applyHistoryDateFilter}
        onClearDateFilter={controller.clearHistoryDateFilter}
        onClose={controller.closeHistoryModal}
      />
      <AuthModal
        isOpen={controller.authModalOpen}
        initialAuth={controller.auth}
        loginOptions={controller.loginOptions}
        onSubmit={controller.handleAuthSave}
      />
      <SetorConfigModal
        isOpen={controller.setorModalOpen}
        form={controller.setorForm}
        managedItems={controller.managedSetores}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateSetorForm}
        onAddDespesa={controller.addSetorDespesa}
        onRemoveDespesa={controller.removeSetorDespesa}
        onSave={controller.saveSetor}
        onClose={controller.closeSetorModal}
      />
      <DespesaConfigModal
        isOpen={controller.despesaModalOpen}
        form={controller.despesaForm}
        references={controller.references}
        managedItems={controller.managedDespesas}
        allowInactivate={controller.isAdmin}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateDespesaForm}
        onSave={controller.saveDespesa}
        onClose={controller.closeDespesaModal}
      />
      <UserConfigModal
        isOpen={controller.userModalOpen}
        form={controller.userForm}
        availableUsers={controller.references?.usuarios || []}
        managedUsers={controller.managedUsers}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateUserForm}
        onToggleVisibleUser={controller.toggleUserVisibility}
        onSave={controller.saveUser}
        onClose={controller.closeUserModal}
      />
      <EntityConfigModal
        isOpen={controller.entityModalOpen}
        form={controller.entityForm}
        empresas={controller.managedEmpresas}
        fornecedores={controller.managedFornecedores}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateEntityForm}
        onSave={controller.saveEntity}
        onClose={controller.closeEntityModal}
      />
      <ExportModal
        isOpen={controller.exportModalOpen}
        form={controller.exportForm}
        references={controller.references}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updateExportForm}
        onExportPdf={handleExportPdf}
        onExportExcel={handleExportExcel}
        onClose={controller.closeExportModal}
      />
      <ChangePasswordModal
        isOpen={controller.passwordModalOpen}
        form={controller.passwordForm}
        loading={controller.loading}
        error={controller.error}
        onChange={controller.updatePasswordForm}
        onSave={controller.savePassword}
        onClose={controller.closePasswordModal}
      />
    </div>
  )
}

export default PagamentosPage

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
