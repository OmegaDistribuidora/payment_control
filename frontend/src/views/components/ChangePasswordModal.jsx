import { defaultPasswordForm } from '../../models/pagamentoModel.js'

function ChangePasswordModal({ isOpen, form = defaultPasswordForm, loading, error, onChange, onSave, onClose }) {
  if (!isOpen) return null

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal modal-user">
        <header className="modal-header">
          <div>
            <div className="modal-title">Trocar Senha</div>
            <div className="modal-subtitle">Atualize a sua senha de acesso</div>
          </div>
          <button className="modal-close" type="button" onClick={onClose} aria-label="Fechar">
            x
          </button>
        </header>

        <div className="modal-body">
          <div className="modal-field">
            <label className="modal-label">Senha atual</label>
            <input
              className="modal-input"
              type="password"
              value={form.currentPassword || ''}
              onChange={(event) => onChange('currentPassword', event.target.value)}
              disabled={loading}
            />
          </div>
          <div className="modal-field">
            <label className="modal-label">Nova senha</label>
            <input
              className="modal-input"
              type="password"
              value={form.newPassword || ''}
              onChange={(event) => onChange('newPassword', event.target.value)}
              disabled={loading}
            />
          </div>
          {error ? <div className="modal-error">{error}</div> : null}
        </div>

        <footer className="modal-footer">
          <button className="modal-action ghost" type="button" onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button className="modal-action primary" type="button" onClick={onSave} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar senha'}
          </button>
        </footer>
      </div>
    </div>
  )
}

export default ChangePasswordModal
