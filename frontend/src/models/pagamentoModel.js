export const emptyRowsCount = 10

export const statusOptions = ['RASCUNHO', 'LANCADO', 'PAGO', 'CANCELADO']

export const defaultFilters = {
  de: '',
  ate: '',
  sede: '',
  setor: '',
  despesa: '',
  dotacao: '',
  status: '',
  q: '',
}

export const defaultForm = {
  dtPagamento: '',
  dtVencimento: '',
  sede: '',
  colaborador: '',
  setor: '',
  despesa: '',
  dotacao: '',
  empresaFornecedor: '',
  setorPagamento: '',
  valorTotal: '',
  descricao: '',
  rateios: [],
  status: 'LANCADO',
}

export const sheetColumns = [
  { key: 'codVld', label: 'Núm. Lanç.', align: 'center', value: (p) => p.codVld ?? '' },
  {
    key: 'colaborador',
    label: 'Colaborador',
    align: 'left',
    value: (p) => p.colaborador ?? p.criadoPor ?? '',
  },
  { key: 'sede', label: 'Sede', align: 'left', value: (p) => p.sede ?? '' },
  { key: 'dtSistema', label: 'Dt Registro', align: 'center', value: (p) => formatDateTime(p.dtSistema) },
  { key: 'dtVencimento', label: 'Dt Vencimento', align: 'center', value: (p) => formatDate(p.dtVencimento) },
  { key: 'setor', label: 'Setor', align: 'left', value: (p) => p.setor ?? '' },
  { key: 'despesa', label: 'Despesa', align: 'left', value: (p) => p.despesa ?? '' },
  { key: 'setorPagamento', label: 'Quem?', align: 'center', value: (p) => p.setorPagamento ?? '' },
  { key: 'dotacao', label: 'Dotação', align: 'left', value: (p) => p.dotacao ?? '' },
  {
    key: 'empresaFornecedor',
    label: 'Empresa/Fornecedor',
    align: 'left',
    value: (p) => p.empresaFornecedor ?? '',
  },
  { key: 'valor', label: 'Valor do lançamento', align: 'right', value: (p) => formatCurrency(p.valorTotal) },
  { key: 'descricao', label: 'Descrição', align: 'left', value: (p) => p.descricao ?? '' },
]

export const novoPagamentoFields = [
  { key: 'dtPagamento', label: 'Data de Pagamento', type: 'date', required: true },
  { key: 'dtVencimento', label: 'Data de Vencimento', type: 'date', required: true },
  { key: 'sede', label: 'Sede', type: 'select', placeholder: 'Selecione...', required: true },
  { key: 'colaborador', label: 'Colaborador', type: 'text', placeholder: 'Digite o colaborador', required: true },
  { key: 'setor', label: 'Setor', type: 'select', placeholder: 'Selecione...', required: true },
  { key: 'despesa', label: 'Despesa', type: 'select', placeholder: 'Selecione...', required: true },
  { key: 'valorTotal', label: 'Valor Total', type: 'text', placeholder: '0,00', required: true },
  { key: 'dotacao', label: 'Dotação', type: 'select', placeholder: 'Selecione...', required: true },
  {
    key: 'empresaFornecedor',
    label: 'Empresa/Fornecedor',
    type: 'select',
    placeholder: 'Selecione...',
  },
  {
    key: 'setorPagamento',
    label: 'Quem?',
    type: 'select',
    placeholder: 'Selecione...',
    required: true,
  },
  {
    key: 'descricao',
    label: 'Descrição do Pagamento',
    type: 'textarea',
    placeholder: '',
  },
]

function parseDate(value) {
  if (!value) return null
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(year, month - 1, day)
  }
  return new Date(value)
}

export function formatDate(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return value || ''
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

export function formatDateTime(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return value || ''
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function formatMonth(value) {
  const date = parseDate(value)
  if (!date || Number.isNaN(date.getTime())) return ''
  const month = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(date)
  return month.charAt(0).toUpperCase() + month.slice(1)
}

export function formatCurrency(value) {
  if (value === null || value === undefined || value === '') return ''
  const numberValue = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(numberValue)) return ''
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numberValue)
}

export function formatStatusLabel(status) {
  if (!status) return ''
  const map = {
    RASCUNHO: 'Rascunho',
    LANCADO: 'Lançado',
    PAGO: 'Pago',
    CANCELADO: 'Cancelado',
  }
  return map[status] || status
}

export function formatCurrencyInput(value) {
  if (value === null || value === undefined) return ''
  const digits = value.toString().replace(/\D/g, '')
  if (!digits) return ''
  const cents = Number(digits) / 100
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents)
}

export function parseCurrency(value) {
  if (typeof value === 'number') return value
  if (!value) return 0
  const raw = value
    .toString()
    .replace(/\s/g, '')
    .replace(/[R$]/g, '')
  const hasComma = raw.includes(',')
  const hasDot = raw.includes('.')
  let normalized = raw
  if (hasComma) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (hasDot) {
    normalized = raw.replace(/,/g, '')
  }
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

export function toInputDate(value) {
  if (!value) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function mapApiToForm(pagamento) {
  return {
    dtPagamento: toInputDate(pagamento.dtPagamento),
    dtVencimento: toInputDate(pagamento.dtVencimento || pagamento.dtPagamento),
    sede: pagamento.sede ?? '',
    colaborador: pagamento.colaborador ?? '',
    setor: pagamento.setor ?? '',
    despesa: pagamento.despesa ?? '',
    dotacao: pagamento.dotacao ?? '',
    empresaFornecedor: pagamento.empresaFornecedor ?? '',
    setorPagamento: pagamento.setorPagamento ?? '',
    valorTotal: formatCurrencyInput(pagamento.valorTotal ?? ''),
    descricao: pagamento.descricao ?? '',
    rateios: Array.isArray(pagamento.rateios)
      ? pagamento.rateios.map((item) => ({
          nome: item.nome,
          valor: formatCurrencyInput(item.valor),
        }))
      : [],
    status: pagamento.status ?? 'LANCADO',
  }
}

function buildRateiosPayload(rateios) {
  if (!Array.isArray(rateios)) return []
  return rateios
    .map((item) => ({
      nome: item.nome,
      valor: parseCurrency(item.valor),
    }))
    .filter((item) => item.nome && item.valor > 0)
}

export function buildCreatePayload(form) {
  return {
    dtPagamento: form.dtPagamento,
    dtVencimento: form.dtVencimento,
    sede: form.sede.trim(),
    colaborador: form.colaborador.trim(),
    setor: form.setor.trim(),
    despesa: form.despesa.trim(),
    dotacao: form.dotacao.trim(),
    empresaFornecedor: form.empresaFornecedor?.trim() || null,
    setorPagamento: form.setorPagamento.trim(),
    valorTotal: parseCurrency(form.valorTotal),
    descricao: form.descricao?.trim() || null,
    rateios: buildRateiosPayload(form.rateios),
  }
}

export function buildUpdatePayload(form) {
  return buildCreatePayload(form)
}

export function getColumnValue(pagamento, column) {
  if (column.value) return column.value(pagamento)
  return pagamento[column.key] ?? ''
}
