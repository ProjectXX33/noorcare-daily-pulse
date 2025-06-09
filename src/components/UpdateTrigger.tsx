import { useEffect } from 'react';

const UpdateTrigger = () => {
  useEffect(() => {
    // Check for updates immediately when app loads
    const triggerUpdateCheck = () => {
      console.log('[UpdateTrigger] Checking for updates on app load...');
      
      // Clear last update check to force a new check
      const lastCheck = localStorage.getItem('last-update-check');
      const timeSinceLastCheck = lastCheck ? Date.now() - parseInt(lastCheck) : Infinity;
      
      // If more than 2 hours since last check, trigger new check
      if (timeSinceLastCheck > 2 * 60 * 60 * 1000) {
        console.log('[UpdateTrigger] Triggering update check - been', Math.round(timeSinceLastCheck / 60000), 'minutes since last check');
        
        // Dispatch custom event that AppUpdateManager can listen for
        window.dispatchEvent(new CustomEvent('force-update-check', {
          detail: { reason: 'app-load', timestamp: Date.now() }
        }));
      } else {
        console.log('[UpdateTrigger] Skipping update check - only been', Math.round(timeSinceLastCheck / 60000), 'minutes since last check');
      }
    };

    // Small delay to ensure other components are loaded
    const timer = setTimeout(triggerUpdateCheck, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
};

export default UpdateTrigger; 