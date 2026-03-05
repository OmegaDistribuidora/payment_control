import PagamentosPage from './views/pages/PagamentosPage.jsx'
import MaintenancePage from './views/pages/MaintenancePage.jsx'

const MAINTENANCE_MODE =
  String(import.meta.env.VITE_MAINTENANCE_MODE || '').trim().toLowerCase() === 'true'

function App() {
  if (MAINTENANCE_MODE) {
    return <MaintenancePage />
  }

  return <PagamentosPage />
}

export default App
