import { buildBasicAuthHeader } from '../models/authModel.js'

const API_BASE_URL = resolveApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

function resolveApiBaseUrl(rawValue) {
  const value = String(rawValue || '').trim()
  if (!value) return 'http://localhost:8080'
  const withoutTrailingSlash = value.replace(/\/+$/, '')
  if (/^https?:\/\//i.test(withoutTrailingSlash)) {
    return withoutTrailingSlash
  }
  // Em produção (Vite), aceitar domínio sem protocolo e assumir HTTPS.
  return `https://${withoutTrailingSlash}`
}

export async function apiRequest(path, { method = 'GET', body, auth, headers, signal } = {}) {
  const url = `${API_BASE_URL}${path}`
  const authHeader = buildBasicAuthHeader(auth)
  const requestHeaders = {
    ...(body ? { 'Content-Type': 'application/json' } : {}),
    ...(authHeader ? { Authorization: authHeader } : {}),
    ...headers,
  }

  const response = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body ? JSON.stringify(body) : undefined,
    signal,
  })

  if (response.status === 204) return null

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const data = isJson ? await response.json() : await response.text()

  // Evita "login falso" quando VITE_API_BASE_URL está apontando para frontend/static.
  if (response.ok && path.startsWith('/api/') && !isJson) {
    const error = new Error('Resposta invalida da API. Verifique VITE_API_BASE_URL do frontend.')
    error.status = 502
    error.details = data
    throw error
  }

  if (!response.ok) {
    const message = isJson ? data?.message || data?.error || 'Erro na requisição' : data
    const error = new Error(message)
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}
