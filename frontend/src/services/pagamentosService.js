import { apiRequest } from './apiClient.js'

function buildQueryParams(filters, page) {
  const params = new URLSearchParams()

  if (filters?.de) params.set('de', filters.de)
  if (filters?.ate) params.set('ate', filters.ate)
  if (filters?.usuario) params.set('usuario', filters.usuario)
  if (filters?.setor) params.set('setor', filters.setor)
  if (filters?.despesa) params.set('despesa', filters.despesa)
  if (filters?.dotacao) params.set('dotacao', filters.dotacao)
  if (filters?.q) params.set('q', filters.q)

  if (page?.number !== undefined) params.set('page', page.number)
  if (page?.size) params.set('size', page.size)

  const query = params.toString()
  return query ? `?${query}` : ''
}

function normalizePagamentoId(id) {
  const raw = String(id ?? '').trim().replace(/^"+|"+$/g, '')
  if (/^\d+$/.test(raw)) return raw
  const digits = raw.match(/\d+/g)?.join('')
  if (digits) return digits
  throw new Error('ID invalido para operacao.')
}

export function listarPagamentos(auth, filters, page, signal) {
  const query = buildQueryParams(filters, page)
  return apiRequest(`/api/pagamentos/meus${query}`, { auth, signal })
}

export function somarPagamentos(auth, filters, signal) {
  const query = buildQueryParams(filters)
  return apiRequest(`/api/pagamentos/meus/total${query}`, { auth, signal })
}

export function criarPagamento(auth, payload) {
  return apiRequest('/api/pagamentos', { method: 'POST', auth, body: payload })
}

export function editarPagamento(auth, id, payload) {
  const safeId = normalizePagamentoId(id)
  return apiRequest(`/api/pagamentos/${safeId}`, { method: 'PUT', auth, body: payload })
}

export function listarHistorico(auth, id) {
  const safeId = normalizePagamentoId(id)
  return apiRequest(`/api/pagamentos/${safeId}/historico`, { auth })
}

export function buscarPagamento(auth, id) {
  const safeId = normalizePagamentoId(id)
  return apiRequest(`/api/pagamentos/${safeId}`, { auth })
}

export function deletarPagamento(auth, id) {
  const safeId = normalizePagamentoId(id)
  return apiRequest(`/api/pagamentos/${safeId}`, { method: 'DELETE', auth })
}

export function carregarRelatorioSedes(auth, filters, signal) {
  const query = buildQueryParams(filters)
  return apiRequest(`/api/pagamentos/relatorios/sedes${query}`, { auth, signal })
}
