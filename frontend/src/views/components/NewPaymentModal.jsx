import { useMemo } from 'react'
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
  novoPagamentoFields,
  statusOptions,
} from '../../models/pagamentoModel.js'

function Field({ field, value, onChange, disabled, options }) {
  if (field.type === 'display') {
    return <div className="modal-display">{field.value}</div>
  }

  if (field.type === 'textarea') {
    return (
      <textarea
        className="modal-input"
        rows={3}
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        disabled={disabled}
      />
    )
  }

  if (field.key === 'valorTotal') {
    return (
      <input
        className="modal-input"
        type="text"
        inputMode="decimal"
        placeholder={field.placeholder}
        value={value}
        onChange={(event) => onChange(field.key, formatCurrencyInput(event.target.value))}
        disabled={disabled}
      />
    )
  }

  if (field.key === 'colaborador') {
    return (
      <>
        <input
          className="modal-input"
          type="text"
          placeholder={field.placeholder}
          value={value}
          onChange={(event) => onChange(field.key, event.target.value)}
          disabled={disabled}
          list="colaborador-suggestions"
        />
        <datalist id="colaborador-suggestions">
          {options.map((option) => (
            <option key={option.key} value={option.value}>
              {option.label}
            </option>
          ))}
        </datalist>
      </>
    )
  }

  if (field.type === 'select') {
    return (
      <select
        className="modal-input"
        value={value}
        onChange={(event) => onChange(field.key, event.target.value)}
        disabled={disabled}
      >
        <option value="">{field.placeholder || 'Selecione...'}</option>
        {options.map((option) => (
          <option key={option.key} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    )
  }

  return (
    <input
      className="modal-input"
      type={field.type}
      placeholder={field.placeholder}
      value={value}
      onChange={(event) => onChange(field.key, event.target.value)}
      disabled={disabled}
    />
  )
}

function NewPaymentModal({
  isOpen,
  mode,
  form,
  references,
  loading,
  error,
  onChange,
  onSave,
  onClose,
  onDelete,
}) {
  if (!isOpen) return null
  const isEdit = mode === 'edit'
  const rateioItems = useMemo(
    () => buildRateioItems(form.dotacao, references),
    [form.dotacao, references]
  )
  const rateioSum = calculateRateioSum(form.rateios)
  const total = parseCurrency(form.valorTotal)

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal-header">
          <div>
            <div className="modal-title">{isEdit ? 'Editar Pagamento' : 'Novo Pagamento'}</div>
            <div className="modal-subtitle">
              {isEdit ? 'Editar pagamento selecionado' : '+ Novo Pagamento'}
            </div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body form-grid">
          {novoPagamentoFields.map((field) => (
            <div
              className={`modal-field${
                field.type === 'textarea' || field.key === 'descricao' ? ' full' : ''
              }`}
              key={field.key}
            >
              <label className="modal-label">{field.label}</label>
              <Field
                field={field}
                value={form[field.key] ?? ''}
                onChange={onChange}
                disabled={loading}
                options={buildOptions(field.key, references)}
              />
            </div>
          ))}
          {rateioItems.length ? (
            <div className="modal-field full">
              <label className="modal-label">Distribuição</label>
              <div className="rateio-list">
                {rateioItems.map((item) => (
                  <div className="rateio-row" key={item.key}>
                    <span className="rateio-name">{item.label}</span>
                    <input
                      className="modal-input rateio-input"
                      type="text"
                      inputMode="decimal"
                      value={getRateioValue(form.rateios, item.value)}
                      onChange={(event) =>
                        onChange('rateios', upsertRateio(form.rateios, item.value, event.target.value))
                      }
                      disabled={loading}
                    />
                  </div>
                ))}
              </div>
              <div className={`rateio-status${rateioSum === total && total > 0 ? ' ok' : ''}`}>
                Distribuído: {formatCurrency(rateioSum)} / Total: {formatCurrency(total)}
              </div>
            </div>
          ) : null}
          {isEdit ? (
            <div className="modal-field">
              <label className="modal-label">Status</label>
              <select
                className="modal-input"
                value={form.status}
                onChange={(event) => onChange('status', event.target.value)}
                disabled={loading}
              >
                {statusOptions.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {error ? <div className="modal-error full">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          {isEdit ? (
            <button className="modal-action danger" type="button" onClick={onDelete} disabled={loading}>
              Excluir
            </button>
          ) : null}
          <button className="modal-action ghost" type="button" onClick={onClose}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" disabled={loading} onClick={onSave}>
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default NewPaymentModal

function buildOptions(fieldKey, references) {
  if (!references) return []
  if (fieldKey === 'sede') {
    return references.sedes.map((item) => ({
      key: `sede-${item.codigo}`,
      value: item.nome,
      label: `[${item.codigo}] ${item.nome}`,
    }))
  }
  if (fieldKey === 'colaborador') {
    return references.colaboradores.map((item) => ({
      key: `colaborador-${item.codigo}`,
      value: item.nome,
      label: item.email ? `${item.nome} (${item.email})` : item.nome,
    }))
  }
  if (fieldKey === 'setor') {
    return references.setores.map((item) => ({
      key: `setor-${item.codigo}`,
      value: item.nome,
      label: `[${item.codigo}] ${item.nome}`,
    }))
  }
  if (fieldKey === 'despesa') {
    return references.despesas.map((item) => ({
      key: `despesa-${item.codigo}`,
      value: item.nome,
      label: `[${item.codigo}] ${item.nome} - ${item.dspCent}`,
    }))
  }
  if (fieldKey === 'dotacao') {
    return references.dotacoes.map((item) => ({
      key: `dotacao-${item.codigo}`,
      value: item.nome,
      label: `[${item.codigo}] ${item.nome}`,
    }))
  }
  if (fieldKey === 'empresaFornecedor') {
    const empresas = (references.empresas || []).map((item) => ({
      key: `empresa-${item.codigo}`,
      value: item.nome,
      label: `[E ${item.codigo}] ${item.nome}`,
    }))
    const fornecedores = (references.fornecedores || []).map((item) => ({
      key: `fornecedor-${item.codigo}`,
      value: item.nome,
      label: `[F ${item.codigo}] ${item.nome}`,
    }))
    return [...empresas, ...fornecedores]
  }
  if (fieldKey === 'setorPagamento') {
    return references.setores.map((item) => ({
      key: `setor-pag-${item.codigo}`,
      value: item.nome,
      label: `[${item.codigo}] ${item.nome}`,
    }))
  }
  return []
}

function buildRateioItems(dotacao, references) {
  if (!dotacao || !references) return []
  const norm = dotacao.toLowerCase()
  let items = []
  if (norm === 'empresa') items = references.empresas || []
  if (norm === 'fornecedor') items = references.fornecedores || []
  if (norm === 'empr/fornecedor' || norm === 'empresa/fornecedor') {
    items = [...(references.empresas || []), ...(references.fornecedores || [])]
  }
  if (norm === 'funcionario') {
    items = [...(references.empresas || []), ...(references.fornecedores || [])]
  }
  const seen = new Set()
  return items
    .filter((item) => {
      const key = item.nome?.toLowerCase()
      if (!key || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((item) => ({
      key: `rateio-${item.codigo}-${item.nome}`,
      value: item.nome,
      label: item.nome,
    }))
}

function getRateioValue(rateios, nome) {
  if (!Array.isArray(rateios)) return ''
  const found = rateios.find((item) => item.nome === nome)
  return found?.valor || ''
}

function upsertRateio(rateios, nome, rawValue) {
  const next = Array.isArray(rateios) ? [...rateios] : []
  const formatted = formatCurrencyInput(rawValue)
  const idx = next.findIndex((item) => item.nome === nome)
  if (!formatted) {
    if (idx >= 0) next.splice(idx, 1)
    return next
  }
  if (idx >= 0) {
    next[idx] = { ...next[idx], valor: formatted }
  } else {
    next.push({ nome, valor: formatted })
  }
  return next
}

function calculateRateioSum(rateios) {
  if (!Array.isArray(rateios)) return 0
  return rateios.reduce((sum, item) => sum + parseCurrency(item.valor), 0)
}
