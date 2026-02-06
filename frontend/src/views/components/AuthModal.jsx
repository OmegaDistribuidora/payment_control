import { useEffect, useState } from 'react'

function AuthModal({ isOpen, initialAuth, onSubmit }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (isOpen) {
      setUsername('')
      setPassword('')
    }
  }, [isOpen])

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
            <div className="modal-title">Autenticação</div>
            <div className="modal-subtitle">Informe usuário e senha do Basic Auth</div>
          </div>
        </header>

        <form className="modal-body" onSubmit={handleSubmit} autoComplete="off">
          <div className="modal-field">
            <label className="modal-label">Usuário</label>
            <input
              className="modal-input"
              type="text"
              name="pc-auth-user"
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">Senha</label>
            <input
              className="modal-input"
              type="password"
              name="pc-auth-pass"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
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
