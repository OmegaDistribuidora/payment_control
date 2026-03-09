import { apiRequest } from './apiClient.js'

export function criarUsuario(auth, payload) {
  return apiRequest('/api/auth/users', { method: 'POST', auth, body: payload })
}

export function listarOpcoesLogin() {
  return apiRequest('/api/auth/login-options')
}

export function trocarMinhaSenha(auth, payload) {
  return apiRequest('/api/auth/change-password', { method: 'POST', auth, body: payload })
}
