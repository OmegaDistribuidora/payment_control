import { defaultUserForm } from '../../models/pagamentoModel.js'

const permissionOptions = [
  { key: 'canViewReports', label: 'Relatorios' },
  { key: 'canViewHistory', label: 'Auditoria' },
  { key: 'canManageSetores', label: 'Setor' },
  { key: 'canManageDespesas', label: 'Despesa' },
  { key: 'canManageEntities', label: 'Empresas/Fornecedores' },
]

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

  const currentUsername = String((form.mode === 'edit' ? form.targetUsername : form.username) || '')
    .trim()
    .toLowerCase()
  const options = availableUsers.filter((item) => item.ativo !== false && item.username?.toLowerCase() !== currentUsername)
  const selectableUsers = managedUsers.filter((item) => item.ativo && item.username?.toLowerCase() !== 'admin')
  const editableOptions = managedUsers.filter((item) => item.ativo)

  const saveLabel =
    form.mode === 'inactivate'
      ? 'Inativar usuario'
      : form.mode === 'edit'
        ? 'Salvar alteracoes'
        : 'Salvar usuario'

  const subtitle =
    form.mode === 'edit'
      ? 'Edite senha, visibilidade e acessos do usuario'
      : 'Crie um novo usuario ou inative um usuario existente'

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-user">
        <header className="modal-header">
          <div>
            <div className="modal-title">Usuarios</div>
            <div className="modal-subtitle">{subtitle}</div>
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
              <option value="edit">Editar</option>
              <option value="inactivate">Inativar</option>
            </select>
          </div>

          {form.mode === 'inactivate' ? (
            <div className="modal-field">
              <label className="modal-label">Usuario</label>
              <select className="modal-input" value={form.targetUsername || ''} onChange={(event) => onChange('targetUsername', event.target.value)} disabled={loading}>
                <option value="">Selecione...</option>
                {selectableUsers.map((item) => (
                  <option key={`user-manage-${item.username}`} value={item.username}>
                    {item.username}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              {form.mode === 'edit' ? (
                <div className="modal-field">
                  <label className="modal-label">Usuario</label>
                  <select className="modal-input" value={form.targetUsername || ''} onChange={(event) => onChange('targetUsername', event.target.value)} disabled={loading}>
                    <option value="">Selecione...</option>
                    {editableOptions.map((item) => (
                      <option key={`user-edit-${item.username}`} value={item.username}>
                        {item.username}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              <div className="modal-field">
                <label className="modal-label">Login</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form.mode === 'edit' ? form.targetUsername || '' : form.username || ''}
                  onChange={(event) => onChange('username', event.target.value)}
                  placeholder="ex.: omega.tesouraria"
                  disabled={loading || form.mode === 'edit'}
                />
              </div>

              <div className="modal-field">
                <label className="modal-label">Senha</label>
                <input
                  className="modal-input"
                  type="text"
                  value={form.password || ''}
                  onChange={(event) => onChange('password', event.target.value)}
                  placeholder={form.mode === 'edit' ? 'Deixe em branco para manter a atual' : 'Digite a senha'}
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

              <div className="modal-field">
                <label className="modal-label">Permissoes</label>
                <div className="user-visibility-list">
                  {permissionOptions.map((item) => {
                    const checked = form.permissions?.[item.key] === true
                    return (
                      <label key={item.key} className="user-visibility-item">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onChange('permissions', { [item.key]: !checked })}
                          disabled={loading}
                        />
                        <span>{item.label}</span>
                      </label>
                    )
                  })}
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
            {loading ? 'Salvando...' : saveLabel}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default UserConfigModal
