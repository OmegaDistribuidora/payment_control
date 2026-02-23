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
import { formatDate, formatMonth } from '../../models/pagamentoModel.js'
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
    if (controller.viewMode === 'spreadsheet') {
      await controller.fetchSpreadsheetRows()
      return
    }
    await controller.fetchPagamentos({ pageNumber: controller.pageInfo.number, skipCache: true })
  }, [controller.fetchPagamentos, controller.fetchSpreadsheetRows, controller.pageInfo.number, controller.viewMode])

  return (
    <div className="app">
      <TopBar
        currentDate={formatDate(today)}
        currentMonth={formatMonth(today)}
        onCreate={controller.openCreateModal}
        onHistory={controller.openHistoryModal}
        onToggleFilters={controller.toggleFilters}
        onConfigSetor={controller.openSetorModal}
        onConfigDespesa={controller.openDespesaModal}
        onToggleView={controller.toggleViewMode}
        viewMode={controller.viewMode}
        onReload={handleReload}
        disableHistory={controller.viewMode !== 'cards' || !controller.selectedId}
        isAuthenticated={Boolean(controller.auth)}
        onAuthAction={handleAuthAction}
        loading={controller.loading}
        showSetorButton={controller.canCreateSetor}
        showDespesaButton={controller.canCreateDespesa}
      />
      <FiltersBar
        filters={controller.filters}
        userLabel={controller.auth?.username}
        totalValue={controller.totalValue}
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
      {controller.viewMode === 'cards' ? (
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
        items={controller.historyItems}
        loading={controller.historyLoading}
        error={controller.historyError}
        onClose={controller.closeHistoryModal}
      />
      <AuthModal
        isOpen={controller.authModalOpen}
        initialAuth={controller.auth}
        onSubmit={controller.handleAuthSave}
      />
      <SetorConfigModal
        isOpen={controller.setorModalOpen}
        form={controller.setorForm}
        loading={controller.loading}
        error={controller.error}
        onNomeChange={controller.updateSetorNome}
        onAddDespesa={controller.addSetorDespesa}
        onRemoveDespesa={controller.removeSetorDespesa}
        onSave={controller.saveSetor}
        onClose={controller.closeSetorModal}
      />
      <DespesaConfigModal
        isOpen={controller.despesaModalOpen}
        form={controller.despesaForm}
        references={controller.references}
        loading={controller.loading}
        error={controller.error}
        onSetorChange={controller.updateDespesaSetor}
        onDespesaChange={controller.updateDespesaNome}
        onSave={controller.saveDespesa}
        onClose={controller.closeDespesaModal}
      />
    </div>
  )
}

export default PagamentosPage
