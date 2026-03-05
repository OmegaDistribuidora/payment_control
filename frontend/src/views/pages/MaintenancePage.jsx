import { useState } from 'react'
import '../../styles/maintenance.css'

const IMAGE_PATH = '/manutencao.png'

function MaintenancePage() {
  const [imageError, setImageError] = useState(false)

  return (
    <main className="maintenance-root" aria-live="polite">
      <div
        className="maintenance-bg"
        style={{
          backgroundImage: imageError ? 'none' : `url(${IMAGE_PATH})`,
        }}
      />
      <div className="maintenance-overlay" />

      <section className="maintenance-card">
        {!imageError ? (
          <img
            className="maintenance-image"
            src={IMAGE_PATH}
            alt="Sistema em manutencao"
            onError={() => setImageError(true)}
          />
        ) : null}
        <h1 className="maintenance-title">Sistema temporariamente em manutencao</h1>
        <p className="maintenance-subtitle">
          Estamos finalizando uma migracao para melhorar estabilidade e custo.
        </p>
        <p className="maintenance-subtitle">Por favor, aguarde.</p>
      </section>
    </main>
  )
}

export default MaintenancePage
