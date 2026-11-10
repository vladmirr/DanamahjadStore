import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { initDashboardBackground } from './utils/dashboardBg'

// Initialize the ultra-modern interactive background canvas
initDashboardBackground({ canvasId: 'dashboard-bg' })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
