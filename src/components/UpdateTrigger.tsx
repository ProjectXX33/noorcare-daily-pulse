import { useEffect } from 'react';
import { cacheManager } from '@/utils/cacheManager';

const UpdateTrigger = () => {
  useEffect(() => {
    // Force cache check and clearing on every app load
    const triggerCacheClearAndUpdate = async () => {
      console.log('[UpdateTrigger] Initiating cache clear and update check on app load...');
      
      try {
        // Clear cache immediately to ensure fresh content
        const cacheCleared = await cacheManager.clearAllCaches();
        
        if (cacheCleared) {
          console.log('[UpdateTrigger] Cache cleared successfully on app load');
        } else {
          console.warn('[UpdateTrigger] Cache clearing failed, but continuing...');
        }
        
        // Always trigger update check regardless of timing
        console.log('[UpdateTrigger] Forcing update check...');
        
        // Dispatch custom event that AppUpdateManager can listen for
        window.dispatchEvent(new CustomEvent('force-update-check', {
          detail: { 
            reason: 'app-load-with-cache-clear', 
            timestamp: Date.now(),
            cacheCleared: cacheCleared
          }
        }));
        
        // Mark the cache clear timestamp
        localStorage.setItem('last-cache-clear', Date.now().toString());
        
      } catch (error) {
        console.error('[UpdateTrigger] Error during cache clear and update:', error);
        
        // Still try to trigger update check even if cache clearing failed
        window.dispatchEvent(new CustomEvent('force-update-check', {
          detail: { 
            reason: 'app-load-fallback', 
            timestamp: Date.now(),
            error: error.message
          }
        }));
      }
    };

    // Small delay to ensure other components are loaded, then force cache clear
    const timer = setTimeout(triggerCacheClearAndUpdate, 1000);
    
    return () => clearTimeout(timer);
  }, []);

  return null; // This component doesn't render anything
};

export default UpdateTrigger; 