import { useMemo } from 'react'
import {
  formatCurrency,
  formatCurrencyInput,
  parseCurrency,
  novoPagamentoFields,
  statusOptions,
} from '../../models/pagamentoModel.js'

const DESPESAS_POR_SETOR = {
  rh: [
    '13o Salario',
    'Acordo Trabalhista',
    'Ajuda De Custo Promotor',
    'Ajuda De Custos - Transporte',
    'Aso - Exames Adm E Demis.',
    'Confraternizacao',
    'Crachas E Uniformes',
    'Despesas Com Alimentacao - Almoco',
    'Despesas Com Reuniao',
    'Despesas De Alimentacao Pessoal',
    'Despesas Com Alimentacao',
    'Diarias Avulsas',
    'Diarias Com Tercerizados',
    'Diarias De Mot. E Ajudantes Ext.',
    'Ferias',
    'Fgts',
    'Fgts - Consignado',
    'Fgts - Rescisao',
    'Gratificacoes Pessoal',
    'Inss',
    'Plano De Saude',
    'Coparticipacao - Plano de Saude',
    'Plano Odontoligico',
    'Rescisoes Trabalhistas',
    'Folhas de pagamento - Mensal',
    'Adiantamento quinzenal',
    'Taxa Sindical',
    'Vale Transporte',
    'Viagens e Estadias',
    'Distrato',
    'Caju - Salario',
    'Caju - Ferias',
    'Caju - Combustivel',
    'Rescisao',
    'Pensao Alimenticia',
    'Pro Labore',
  ],
  administrativo: [
    'Agua e Esgoto',
    'Aluguel Predio',
    'Assistencia Medica',
    'Cartorio / Taxas - Adm',
    'Cesta Basica',
    'Compra de Agua - Garrafao',
    'Contribuicoes e Doacoes',
    'Diversos',
    'Energia Eletrica',
    'Estacionamento',
    'Imobilizados',
    'Internet E Telefonia',
    'Iptu',
    'Manutencao e Conservacao Predial',
    'Mat. de Expediente',
    'Outros Tributos Estaduais',
    'Outros Tributos Municipais',
    'Pis/Cofins',
    'Pro Labore',
    'Salario do Administrativo',
    'Servico De Seguranca',
  ],
  ti: [
    'Aquisicao Equip. Informatica',
    'Licenca Programas',
    'Manutencao De Equip. Informatica',
    'Manutencao Sistemas',
    'Salario de TI',
    'Tinta Para Impressoras',
  ],
  logistico: [
    'Cipa e Material de Seguranca',
    'Combustivel',
    'Credito para Cliente por Produto Coletado',
    'Depreciacao De Utilizacao Veiculos Proprio',
    'Despesas Veiculo',
    'Ipva / Licenciamento',
    'Multa / Transito',
    'Salario da Logistica',
  ],
  comercial: ['Fornecedores Invest.', 'Salario'],
  contabil: ['Honorarios', 'Salario'],
}

const DESPESA_ALIASES = {
  'adiantamento quinzenal': ['andiantamento quinzenal'],
  'despesas com alimentacao - almoco': ['despesas com alimentacao - almoco'],
  'coparticipacao - plano de saude': ['coparticipacao - plano de saude'],
}

const COLABORADOR_OPTIONS = [
  'Administrativo Barroso',
  'Diretoria',
  'Financeiro Barroso',
  'RH',
  'Administrativo - Cariri',
  'Logistica - Cariri',
  'Financeiro Sobral',
  'Administrativo Sobral',
  'Administrativo Matriz',
  'Financeiro Matriz',
].sort((a, b) => a.localeCompare(b, 'pt-BR'))

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
          {novoPagamentoFields.map((field) => {
            const despesaBloqueada = field.key === 'despesa' && !form.setor
            return (
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
                  disabled={loading || despesaBloqueada}
                  options={buildOptions(field.key, references, form)}
                />
              </div>
            )
          })}
          {rateioItems.length ? (
            <div className="modal-field full">
              <label className="modal-label">Distribuicao</label>
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
                Distribuido: {formatCurrency(rateioSum)} / Total: {formatCurrency(total)}
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

function buildOptions(fieldKey, references, form) {
  if (!references) return []
  if (fieldKey === 'sede') {
    return references.sedes.map((item) => ({
      key: `sede-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
  }
  if (fieldKey === 'colaborador') {
    const options = COLABORADOR_OPTIONS.map((nome) => ({
      key: `colaborador-${normalizeText(nome)}`,
      value: nome,
      label: nome,
    }))
    const atual = form?.colaborador
    if (atual && !options.some((item) => normalizeText(item.value) === normalizeText(atual))) {
      options.push({
        key: `colaborador-atual-${normalizeText(atual)}`,
        value: atual,
        label: atual,
      })
    }
    return options
  }
  if (fieldKey === 'setor') {
    const setores = [...(references.setores || [])]
    if (!setores.some((item) => normalizeText(item.nome) === 'comercial')) {
      setores.push({ codigo: 'extra-comercial', nome: 'Comercial' })
    }
    return setores.map((item) => ({
      key: `setor-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
  }
  if (fieldKey === 'despesa') {
    return buildDespesaOptions(form?.setor, references, form?.despesa)
  }
  if (fieldKey === 'dotacao') {
    return references.dotacoes.map((item) => ({
      key: `dotacao-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
  }
  if (fieldKey === 'empresaFornecedor') {
    const empresas = (references.empresas || []).map((item) => ({
      key: `empresa-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
    const fornecedores = (references.fornecedores || []).map((item) => ({
      key: `fornecedor-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
    return [...empresas, ...fornecedores]
  }
  if (fieldKey === 'setorPagamento') {
    return references.setores.map((item) => ({
      key: `setor-pag-${item.codigo}`,
      value: item.nome,
      label: item.nome,
    }))
  }
  return []
}

function buildDespesaOptions(setorSelecionado, references, despesaAtual) {
  if (!setorSelecionado) return []

  const listaDinamica = resolveSetorDespesasDinamicas(setorSelecionado, references?.setorDespesas)
  const setorKey = resolveSetorKey(setorSelecionado)
  const listaPermitida = listaDinamica.length ? listaDinamica : DESPESAS_POR_SETOR[setorKey] || []
  const despesasDisponiveis = references?.despesas || []
  const options = []
  const used = new Set()

  for (const nomePreferencial of listaPermitida) {
    const match = findDespesaMatch(nomePreferencial, despesasDisponiveis)
    const value = match?.nome || nomePreferencial
    const keyNorm = normalizeText(value)
    if (!keyNorm || used.has(keyNorm)) continue
    used.add(keyNorm)
    options.push({
      key: `despesa-${match?.codigo ?? keyNorm}`,
      value,
      label: nomePreferencial,
    })
  }

  if (despesaAtual) {
    const atualNorm = normalizeText(despesaAtual)
    if (!used.has(atualNorm)) {
      options.push({
        key: `despesa-atual-${atualNorm}`,
        value: despesaAtual,
        label: despesaAtual,
      })
    }
  }

  return options
}

function findDespesaMatch(nomePreferencial, despesasDisponiveis) {
  const nomeNorm = normalizeText(nomePreferencial)
  const aliases = DESPESA_ALIASES[nomeNorm] || []
  const candidatos = new Set([nomeNorm, ...aliases.map((item) => normalizeText(item))])

  return despesasDisponiveis.find((item) => candidatos.has(normalizeText(item.nome)))
}

function resolveSetorKey(setor) {
  const norm = normalizeText(setor)
  if (norm === 'financeiro') return 'comercial'
  if (norm === 'contabil') return 'contabil'
  return norm
}

function resolveSetorDespesasDinamicas(setorSelecionado, setorDespesas) {
  if (!setorDespesas || typeof setorDespesas !== 'object') {
    return []
  }
  const alvo = normalizeText(setorSelecionado)
  const entry = Object.entries(setorDespesas).find(([setorNome]) => normalizeText(setorNome) === alvo)
  if (!entry || !Array.isArray(entry[1])) {
    return []
  }
  return entry[1].filter(Boolean)
}

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
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
