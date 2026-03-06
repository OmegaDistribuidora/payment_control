import { apiRequest } from './apiClient.js'

export function criarUsuario(auth, payload) {
  return apiRequest('/api/auth/users', { method: 'POST', auth, body: payload })
}
