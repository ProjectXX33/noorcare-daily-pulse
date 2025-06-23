import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './styles/rtl.css'
import { recalculateOvertimeHours } from './utils/recalculateOvertime.js'
import { CacheManager } from './utils/cacheManager'
import { cleanupOldNotificationsForAllUsers } from './lib/notifications'

// Make recalculation function available globally for console access
if (typeof window !== 'undefined') {
  (window as any).recalculateOvertime = recalculateOvertimeHours
  
  // Make notification cleanup available globally
  (window as any).cleanupNotifications = cleanupOldNotificationsForAllUsers
  
  // Make cache clearing available globally (preserves auth)
  (window as any).clearCacheKeepAuth = async () => {
    const cacheManager = new CacheManager()
    return await cacheManager.forceCacheClearKeepAuth()
  }

  console.log('🌟 Global utilities available:')
  console.log('  • recalculateOvertime() - Recalculate overtime hours')
  console.log('  • cleanupNotifications() - Clean old notifications for all users')  
  console.log('  • clearCacheKeepAuth() - Clear all caches while preserving login')
}

// Expose cache clearing function globally
CacheManager.exposeGlobalCacheClear();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Service Worker registration is handled by AppUpdateManager for better update management
