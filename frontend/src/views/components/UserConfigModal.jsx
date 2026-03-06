import { defaultUserForm, usuarioRoleOptions } from '../../models/pagamentoModel.js'

function UserConfigModal({ isOpen, form = defaultUserForm, loading, error, onChange, onSave, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-user">
        <header className="modal-header">
          <div>
            <div className="modal-title">Criar Usuario</div>
            <div className="modal-subtitle">Defina login, senha e perfil de acesso</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Login</label>
            <input
              className="modal-input"
              type="text"
              value={form.username || ''}
              onChange={(event) => onChange('username', event.target.value)}
              placeholder="ex.: usuario.financeiro"
              disabled={loading}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Senha</label>
            <input
              className="modal-input"
              type="text"
              value={form.password || ''}
              onChange={(event) => onChange('password', event.target.value)}
              placeholder="Digite a senha"
              disabled={loading}
            />
          </div>

          <div className="modal-field">
            <label className="modal-label">Perfil</label>
            <select
              className="modal-input"
              value={form.role || 'MATRIZ'}
              onChange={(event) => onChange('role', event.target.value)}
              disabled={loading}
            >
              {usuarioRoleOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar usuario'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default UserConfigModal
