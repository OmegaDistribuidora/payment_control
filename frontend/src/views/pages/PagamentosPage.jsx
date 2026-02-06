import { useCallback } from 'react'
import { usePagamentosController } from '../../controllers/pagamentosController.js'
import FiltersBar from '../components/FiltersBar.jsx'
import FiltersPanel from '../components/FiltersPanel.jsx'
import NewPaymentModal from '../components/NewPaymentModal.jsx'
import HistoryModal from '../components/HistoryModal.jsx'
import SheetTable from '../components/SheetTable.jsx'
import TopBar from '../components/TopBar.jsx'
import AuthModal from '../components/AuthModal.jsx'
import { formatDate, formatMonth } from '../../models/pagamentoModel.js'
import '../../styles/payments.css'

function PagamentosPage() {
  const controller = usePagamentosController()
  const today = new Date()
  const handleSelect = useCallback(
    (id) => controller.setSelectedId(controller.selectedId === id ? null : id),
    [controller.selectedId, controller.setSelectedId]
  )

  return (
    <div className="app">
      <TopBar
        currentDate={formatDate(today)}
        currentMonth={formatMonth(today)}
        onCreate={controller.openCreateModal}
        onEdit={controller.openEditModal}
        onHistory={controller.openHistoryModal}
        onToggleFilters={controller.toggleFilters}
        onReload={() => controller.fetchPagamentos({ pageNumber: controller.pageInfo.number })}
        disableEdit={!controller.selectedId || controller.selectedPagamento?.status === 'PAGO'}
        disableHistory={!controller.selectedId}
        loading={controller.loading}
      />
      <FiltersBar
        filters={controller.filters}
        userLabel={controller.auth?.username}
        totalValue={controller.totalValue}
        onQuickFilter={controller.applyQuickFilter}
      />
      <FiltersPanel
        isOpen={controller.isFiltersOpen}
        filters={controller.filters}
        references={controller.references}
        onChange={controller.updateFilters}
        onApply={controller.applyFilters}
        onClear={controller.clearFilters}
        onAuthReset={controller.handleAuthClear}
        loading={controller.loading}
      />
      {controller.error ? <div className="page-error">{controller.error}</div> : null}
      {controller.loading ? <div className="loading-hint">Carregando dados...</div> : null}
      <SheetTable
        rows={controller.pagamentos}
        selectedId={controller.selectedId}
        loading={controller.loading}
        onSelect={handleSelect}
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
            Página {controller.pageInfo.number + 1} de {controller.pageInfo.totalPages || 1}
          </span>
          <button
            className="modal-action ghost"
            type="button"
            onClick={controller.goNextPage}
            disabled={!controller.canPaginateNext || controller.loading}
          >
            Próxima
          </button>
        </div>
      </div>
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
    </div>
  )
}

export default PagamentosPage
