export function loadAuth() {
  return null
}

export function saveAuth(auth) {
  if (!auth?.username || !auth?.password) return
}

export function clearAuth() {
}

export function buildBasicAuthHeader(auth) {
  if (!auth?.username || !auth?.password) return null
  return `Basic ${btoa(`${auth.username}:${auth.password}`)}`
}
