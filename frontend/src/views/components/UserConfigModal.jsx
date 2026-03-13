import { defaultUserForm } from '../../models/pagamentoModel.js'

function UserConfigModal({
  isOpen,
  form = defaultUserForm,
  availableUsers = [],
  managedUsers = [],
  loading,
  error,
  onChange,
  onToggleVisibleUser,
  onSave,
  onClose,
}) {
  if (!isOpen) return null

  const currentUsername = String(form.username || '').trim().toLowerCase()
  const options = availableUsers.filter((item) => item.ativo !== false && item.username?.toLowerCase() !== currentUsername)
  const inactivateOptions = managedUsers.filter((item) => item.ativo && item.username?.toLowerCase() !== 'admin')

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-user">
        <header className="modal-header">
          <div>
            <div className="modal-title">Usuarios</div>
            <div className="modal-subtitle">Crie um novo usuario ou inative um usuario existente</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Acao</label>
            <select className="modal-input" value={form.mode || 'create'} onChange={(event) => onChange('mode', event.target.value)} disabled={loading}>
              <option value="create">Criar novo</option>
              <option value="inactivate">Inativar</option>
            </select>
          </div>

          {form.mode === 'inactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Usuario</label>
              <select className="modal-input" value={form.targetUsername || ''} onChange={(event) => onChange('targetUsername', event.target.value)} disabled={loading}>
                <option value="">Selecione...</option>
                {inactivateOptions.map((item) => (
                  <option key={`user-manage-${item.username}`} value={item.username}>
                    {item.username}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div className="modal-field">
                <label className="modal-label">Login</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form.username || ''}
                  onChange={(event) => onChange('username', event.target.value)}
                  placeholder="ex.: omega.tesouraria"
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
                <label className="modal-label">Usuarios visiveis</label>
                <div className="user-visibility-list">
                  {options.length ? (
                    options.map((item) => {
                      const checked = (form.visibleUsernames || []).includes(item.username)
                      return (
                        <label key={item.username} className="user-visibility-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => onToggleVisibleUser(item.username)}
                            disabled={loading}
                          />
                          <span>{item.username}</span>
                        </label>
                      )
                    })
                  ) : (
                    <div className="setor-despesa-empty">Nenhum usuario disponivel.</div>
                  )}
                </div>
              </div>
            </>
          )}

          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : form.mode === 'inactivate' ? 'Inativar usuario' : 'Salvar usuario'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default UserConfigModal
