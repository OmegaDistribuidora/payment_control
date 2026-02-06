import { formatDate, formatDateTime, formatStatusLabel } from '../../models/pagamentoModel.js'

const FIELD_LABELS = {
  dtPagamento: 'Data de Pagamento',
  dtVencimento: 'Data de Vencimento',
  sede: 'Sede',
  colaborador: 'Colaborador',
  setor: 'Setor',
  despesa: 'Despesa',
  dotacao: 'Dotação',
  empresaFornecedor: 'Empresa/Fornecedor',
  setorPagamento: 'Quem?',
  valorTotal: 'Valor',
  descricao: 'Descrição',
  status: 'Status',
}

const ACTION_LABELS = {
  CRIADO: 'Criado',
  ATUALIZADO: 'Atualizado',
  STATUS_ALTERADO: 'Status alterado',
  EXCLUIDO: 'Excluído',
}

function HistoryModal({ isOpen, items, loading, error, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-history">
        <header className="modal-header">
          <div>
            <div className="modal-title">Histórico do Lançamento</div>
            <div className="modal-subtitle">Registro de alterações e eventos</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>
        <div className="modal-body">
          {loading ? <div className="loading-hint">Carregando histórico...</div> : null}
          {error ? <div className="modal-error">{error}</div> : null}
          {!loading && !error && (!items || items.length === 0) ? (
            <div className="empty-state">Sem histórico.</div>
          ) : null}
          {!loading && !error && items && items.length > 0 ? (
            <div className="history-list">
              {items.map((item) => (
                <article
                  className={`history-item history-item--${String(item.acao || '').toLowerCase()}`}
                  key={item.id}
                >
                  <header className="history-header">
                    <div className="history-action">
                      <span className="history-action-label">
                        {ACTION_LABELS[item.acao] || item.acao}
                      </span>
                    </div>
                    <div className="history-meta">
                      {formatDateTime(item.dtEvento)} · {item.criadoPor || '-'}
                    </div>
                  </header>
                  <div className="history-body">{renderDetails(item.detalhes)}</div>
                </article>
              ))}
            </div>
          ) : null}
        </div>
        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose}>
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}

function renderDetails(raw) {
  if (!raw) return <div className="history-empty">Sem detalhes.</div>
  const parsed = parseDetails(raw) ?? parseLegacyChanges(raw)
  if (!parsed || typeof parsed !== 'object') {
    return <div className="history-text">{raw}</div>
  }

  if (parsed.statusAnterior || parsed.statusNovo) {
    return (
      <div className="history-grid">
        <div className="history-row">
          <span className="history-key">Status</span>
          <span className="history-from">{formatValue(parsed.statusAnterior)}</span>
          <span className="history-arrow">→</span>
          <span className="history-to">{formatValue(parsed.statusNovo)}</span>
        </div>
      </div>
    )
  }

  if (isChangeSet(parsed)) {
    return (
      <div className="history-grid">
        {Object.entries(parsed).map(([key, change]) => (
          <div className="history-row" key={key}>
            <span className="history-key">{FIELD_LABELS[key] || key}</span>
            <span className="history-from">{formatValue(change.de)}</span>
            <span className="history-arrow">→</span>
            <span className="history-to">{formatValue(change.para)}</span>
          </div>
        ))}
      </div>
    )
  }

  if (isSnapshot(parsed)) {
    return (
      <div className="history-grid">
        {Object.entries(parsed).map(([key, value]) => (
          <div className="history-row" key={key}>
            <span className="history-key">{FIELD_LABELS[key] || key}</span>
            <span className="history-to">{formatValue(value)}</span>
          </div>
        ))}
      </div>
    )
  }

  return <pre className="history-json">{JSON.stringify(parsed, null, 2)}</pre>
}

function parseDetails(raw) {
  try {
    return JSON.parse(raw)
  } catch (error) {
    return null
  }
}

function parseLegacyChanges(raw) {
  if (!raw || typeof raw !== 'string') return null
  const matches = [...raw.matchAll(/(\w+)=\{de=([^,}]*),\s*para=([^}]*)\}/g)]
  if (!matches.length) return null
  const result = {}
  matches.forEach((match) => {
    const key = match[1]
    const fromValue = normalizeLegacyValue(match[2])
    const toValue = normalizeLegacyValue(match[3])
    result[key] = { de: fromValue, para: toValue }
  })
  return result
}

function normalizeLegacyValue(value) {
  if (value === undefined || value === null) return null
  const trimmed = String(value).trim()
  if (trimmed === 'null' || trimmed === '') return null
  return trimmed
}

function isChangeSet(obj) {
  return Object.values(obj).every(
    (value) => value && typeof value === 'object' && 'de' in value && 'para' in value
  )
}

function isSnapshot(obj) {
  return !Array.isArray(obj) && Object.values(obj).every((value) => typeof value !== 'object')
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '-'
  if (Array.isArray(value)) {
    if (value.length === 0) return '-'
    return value
      .map((item) => {
        if (item && typeof item === 'object') {
          const nome = item.nome || item.name || ''
          const valor = item.valor || item.value || ''
          return nome ? `${nome}${valor ? ` (${formatValue(valor)})` : ''}` : formatValue(valor)
        }
        return String(item)
      })
      .join(', ')
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) return formatDateTime(value)
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value)
    return formatStatusLabel(value)
  }
  return formatStatusLabel(String(value))
}

export default HistoryModal
