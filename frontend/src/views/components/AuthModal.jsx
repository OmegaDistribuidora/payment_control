import { useEffect, useState } from 'react'

const LOGIN_OPTIONS = [
  { value: 'admin', label: 'admin' },
  { value: 'diretoria', label: 'diretoria' },
  { value: 'rh', label: 'rh' },
  { value: 'omega.matriz', label: 'omega.matriz' },
  { value: 'omega.sobral', label: 'omega.sobral' },
  { value: 'omega.cariri', label: 'omega.cariri' },
]

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 5c5.5 0 9.6 4.3 10.9 6.2a1.4 1.4 0 010 1.6C21.6 14.7 17.5 19 12 19S2.4 14.7 1.1 12.8a1.4 1.4 0 010-1.6C2.4 9.3 6.5 5 12 5zm0 2C7.5 7 4 10.4 3.1 12c.9 1.6 4.4 5 8.9 5s8-3.4 8.9-5c-.9-1.6-4.4-5-8.9-5zm0 2.2a2.8 2.8 0 110 5.6 2.8 2.8 0 010-5.6z"
      />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3.3 2.3l18.4 18.4-1.4 1.4-3.4-3.4A12.6 12.6 0 0112 19c-5.5 0-9.6-4.3-10.9-6.2a1.4 1.4 0 010-1.6A15.8 15.8 0 015.9 7L1.9 3.7l1.4-1.4zm4.2 6.4A12.5 12.5 0 003.1 12c.9 1.6 4.4 5 8.9 5a9.8 9.8 0 003.2-.5l-2.1-2.1a2.8 2.8 0 01-3.6-3.6L7.5 8.7zM12 5c5.5 0 9.6 4.3 10.9 6.2a1.4 1.4 0 010 1.6c-.5.7-1.4 1.9-2.8 3.1l-1.4-1.4c1.1-.9 1.9-1.8 2.3-2.5-.9-1.6-4.4-5-8.9-5-1.4 0-2.7.3-3.8.7L6.8 6.2A12 12 0 0112 5z"
      />
    </svg>
  )
}

function AuthModal({ isOpen, initialAuth, onSubmit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setUsername(initialAuth?.username || '')
      setPassword(initialAuth?.password || '')
      setShowPassword(false)
    }
  }, [initialAuth, isOpen])

  if (!isOpen) return null

  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit({ username, password })
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-auth">
        <header className="modal-header">
          <div>
            <div className="modal-title">Autenticacao</div>
            <div className="modal-subtitle">Selecione o usuario e informe a senha</div>
          </div>
        </header>

        <form className="modal-body" onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-field">
            <label className="modal-label">Usuario</label>
            <select
              className="modal-input"
              name="pc-auth-user"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            >
              <option value="">Selecione...</option>
              {LOGIN_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="modal-field">
            <label className="modal-label">Senha</label>
            <div className="auth-password-wrap">
              <input
                className="modal-input auth-password-input"
                type={showPassword ? 'text' : 'password'}
                name="pc-auth-pass"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                className="auth-password-toggle"
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>

          <footer className="modal-footer">
            <button className="modal-action primary" type="submit">
              Conectar
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

export default AuthModal
