import { apiRequest } from './apiClient.js'

export function criarUsuario(auth, payload) {
  return apiRequest('/api/auth/users', { method: 'POST', auth, body: payload })
}

export function atualizarUsuario(auth, username, payload) {
  return apiRequest(`/api/auth/users/${encodeURIComponent(username)}`, { method: 'PUT', auth, body: payload })
}

export function listarOpcoesLogin() {
  return apiRequest('/api/auth/login-options')
}

export function listarUsuariosGestao(auth) {
  return apiRequest('/api/auth/users/manage', { auth })
}

export function buscarMinhaSessao(auth) {
  return apiRequest('/api/auth/me', { auth })
}

export function inativarUsuario(auth, payload) {
  return apiRequest('/api/auth/users/inactivate', { method: 'POST', auth, body: payload })
}

export function trocarMinhaSenha(auth, payload) {
  return apiRequest('/api/auth/change-password', { method: 'POST', auth, body: payload })
}
