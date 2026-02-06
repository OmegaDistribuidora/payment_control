import { apiRequest } from './apiClient.js'

function buildQueryParams(filters, page) {
  const params = new URLSearchParams()

  if (filters?.de) params.set('de', filters.de)
  if (filters?.ate) params.set('ate', filters.ate)
  if (filters?.sede) params.set('sede', filters.sede)
  if (filters?.setor) params.set('setor', filters.setor)
  if (filters?.despesa) params.set('despesa', filters.despesa)
  if (filters?.dotacao) params.set('dotacao', filters.dotacao)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.q) params.set('q', filters.q)

  if (page?.number !== undefined) params.set('page', page.number)
  if (page?.size) params.set('size', page.size)

  const query = params.toString()
  return query ? `?${query}` : ''
}

export function listarPagamentos(auth, filters, page, signal) {
  const query = buildQueryParams(filters, page)
  return apiRequest(`/api/pagamentos/meus${query}`, { auth, signal })
}

export function criarPagamento(auth, payload) {
  return apiRequest('/api/pagamentos', { method: 'POST', auth, body: payload })
}

export function editarPagamento(auth, id, payload) {
  return apiRequest(`/api/pagamentos/${id}`, { method: 'PUT', auth, body: payload })
}

export function alterarStatus(auth, id, status) {
  return apiRequest(`/api/pagamentos/${id}/status`, {
    method: 'PATCH',
    auth,
    body: { status },
  })
}

export function listarHistorico(auth, id) {
  return apiRequest(`/api/pagamentos/${id}/historico`, { auth })
}

export function buscarPagamento(auth, id) {
  return apiRequest(`/api/pagamentos/${id}`, { auth })
}

export function deletarPagamento(auth, id) {
  return apiRequest(`/api/pagamentos/${id}`, { method: 'DELETE', auth })
}
