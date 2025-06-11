import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/rtl.css'
import { recalculateOvertimeHours } from './utils/recalculateOvertime.js'

// Make recalculation function available globally for console access
if (typeof window !== 'undefined') {
  (window as any).recalculateOvertime = recalculateOvertimeHours
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service Worker registration is handled by AppUpdateManager for better update management
