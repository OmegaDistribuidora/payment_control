import { apiRequest } from './apiClient.js'

export function listarSetores(auth) {
  return apiRequest('/api/referencias/setores', { auth })
}

export function listarReferencias(auth) {
  return apiRequest('/api/referencias/todas', { auth })
}

const CACHE_KEY = 'payment_control.referencias.v2'
const CACHE_TTL_MS = 1000 * 60 * 60 * 6

export function loadCachedReferencias() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    return parsed.data
  } catch {
    return null
  }
}

export function saveCachedReferencias(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }))
  } catch {
    // ignore cache write errors
  }
}

export async function listarReferenciasCached(auth) {
  const cached = loadCachedReferencias()
  if (cached) return cached
  const data = await listarReferencias(auth)
  if (data) saveCachedReferencias(data)
  return data
}

export function listarDspCentros(auth) {
  return apiRequest('/api/referencias/dspcentros', { auth })
}

export function listarDespesas(auth) {
  return apiRequest('/api/referencias/despesas', { auth })
}

export function listarEmpresas(auth) {
  return apiRequest('/api/referencias/empresas', { auth })
}

export function listarFornecedores(auth) {
  return apiRequest('/api/referencias/fornecedores', { auth })
}

export function listarSedes(auth) {
  return apiRequest('/api/referencias/sedes', { auth })
}

export function listarDotacoes(auth) {
  return apiRequest('/api/referencias/dotacoes', { auth })
}

export function listarColaboradores(auth) {
  return apiRequest('/api/referencias/colaboradores', { auth })
}
