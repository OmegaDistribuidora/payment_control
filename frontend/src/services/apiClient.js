import { buildBasicAuthHeader } from '../models/authModel.js'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'

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

  if (!response.ok) {
    const message = isJson ? data?.message || data?.error || 'Erro na requisição' : data
    const error = new Error(message)
    error.status = response.status
    error.details = data
    throw error
  }

  return data
}
