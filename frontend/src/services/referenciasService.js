import { apiRequest } from './apiClient.js'

export function listarSetores(auth) {
  return apiRequest('/api/referencias/setores', { auth })
}

export function listarReferencias(auth) {
  return apiRequest('/api/referencias/todas', { auth })
}

export function salvarSetorConfig(auth, payload) {
  return apiRequest('/api/referencias/setores/config', { method: 'POST', auth, body: payload })
}

export function salvarDespesaConfig(auth, payload) {
  return apiRequest('/api/referencias/despesas/config', { method: 'POST', auth, body: payload })
}

const CACHE_KEY = 'payment_control.referencias.v2'
const CACHE_TTL_MS = 1000 * 60 * 60 * 6

function hasReferenceData(data) {
  if (!data) return false
  const sedes = Array.isArray(data.sedes) ? data.sedes.length : 0
  const setores = Array.isArray(data.setores) ? data.setores.length : 0
  const dotacoes = Array.isArray(data.dotacoes) ? data.dotacoes.length : 0
  return sedes > 0 && setores > 0 && dotacoes > 0
}

export function loadCachedReferencias() {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.data || !parsed?.timestamp) return null
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null
    if (!hasReferenceData(parsed.data)) return null
    return parsed.data
  } catch {
    return null
  }
}

export function saveCachedReferencias(data) {
  if (!hasReferenceData(data)) return
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
