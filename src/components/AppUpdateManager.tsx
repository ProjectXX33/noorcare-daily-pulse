import React, { useState, useEffect } from 'react';
import { RefreshCw, Download, X, Smartphone, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cacheManager } from '@/utils/cacheManager';

interface AppUpdateManagerProps {
  currentVersion?: string;
}

interface UpdateInfo {
  available: boolean;
  version: string;
  message: string;
  releaseNotes?: string[];
  forced?: boolean;
}

const AppUpdateManager: React.FC<AppUpdateManagerProps> = ({ 
  currentVersion = '1.0.0' 
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [lastShownVersion, setLastShownVersion] = useState<string>('');
  const [updateCooldown, setUpdateCooldown] = useState(false);

  useEffect(() => {
    // Clear any update-in-progress flag on app load
    localStorage.removeItem('update-in-progress');
    
    initializeUpdateManager();
    checkIfPWA();
    registerServiceWorker();

    // Listen for force update check events
    const handleForceUpdateCheck = () => {
      console.log('[AppUpdateManager] Force update check triggered');
      checkForUpdates();
    };

    window.addEventListener('force-update-check', handleForceUpdateCheck);
    
    return () => {
      window.removeEventListener('force-update-check', handleForceUpdateCheck);
    };
  }, []);

  const initializeUpdateManager = () => {
    // Listen for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // Check for updates on app focus
    window.addEventListener('focus', checkForUpdates);
    
    // Check for updates periodically (every 2 hours)
    const updateCheckInterval = setInterval(checkForUpdates, 2 * 60 * 60 * 1000);

    return () => {
      window.removeEventListener('focus', checkForUpdates);
      clearInterval(updateCheckInterval);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
    };
  };

  const checkIfPWA = () => {
    // Check if app is installed as PWA
    const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone ||
                          document.referrer.includes('android-app://');
    setIsPWA(isPWAInstalled);
  };

  const registerServiceWorker = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        setServiceWorkerRegistration(registration);
        
        // Check for updates immediately
        await registration.update();
        
        // Listen for new service worker installations
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', async () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker installed, show update prompt
                const versionInfo = await fetchVersionInfo();
                setUpdateInfo({
                  available: true,
                  version: versionInfo?.version || 'Latest',
                  message: 'A new version is available with bug fixes and improvements!',
                  releaseNotes: versionInfo?.releaseNotes || ['Bug fixes and performance improvements']
                });
                setShowUpdatePrompt(true);
              }
            });
          }
        });

        console.log('[UpdateManager] Service Worker registered successfully');
      } catch (error) {
        console.error('[UpdateManager] Service Worker registration failed:', error);
      }
    }
  };

  const handleServiceWorkerMessage = (event: MessageEvent) => {
    const { data } = event;
    
    switch (data.type) {
      case 'APP_UPDATED_CACHE_CLEARED':
        console.log('[UpdateManager] App updated with cache cleared:', data);
        handleCacheClearedUpdate(data);
        break;
        
      case 'FORCE_CACHE_CLEAR':
        console.log('[UpdateManager] Force cache clear received:', data);
        handleForceCacheClear(data);
        break;
        
      case 'APP_UPDATED':
        console.log('[UpdateManager] App update detected:', data);
        handleAutoUpdate(data);
        break;
        
      case 'CLEAR_STORAGE':
        console.log('[UpdateManager] Clearing storage:', data);
        clearAppStorage(data.preserveKeys || []);
        break;
        
      case 'NOTIFICATION_CLICK':
        // Handle notification clicks
        if (data.url) {
          window.location.href = data.url;
        }
        break;
    }
  };

  const handleCacheClearedUpdate = async (updateData: any) => {
    try {
      console.log('[UpdateManager] Processing cache-cleared update:', updateData);
      
      // Clear application storage while preserving authentication
      await clearAppStoragePreserveAuth();
      
      // Update version tracking
      if (updateData.version) {
        localStorage.setItem('app-version', updateData.version);
        localStorage.setItem('last-update-check', updateData.timestamp?.toString() || Date.now().toString());
        localStorage.setItem('cache-cleared-version', updateData.version);
      }
      
      // Show success notification
      toast.success('App updated! Cache cleared successfully 🎉', {
        description: 'You now have the latest version with all updates visible.',
        duration: 3000,
      });
      
      console.log('[UpdateManager] Cache-cleared update completed, refreshing...');
      
      // Auto-refresh to show the new version immediately
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      console.error('[UpdateManager] Cache-cleared update failed:', error);
    }
  };

  const handleForceCacheClear = async (clearData: any) => {
    try {
      console.log('[UpdateManager] Processing force cache clear:', clearData);
      
      // Clear all application cache while preserving auth
      await clearAppStoragePreserveAuth();
      
      // Show notification
      toast.info('Cache cleared for fresh updates! 🔄', {
        description: clearData.message || 'Updates will now show immediately.',
        duration: 2000,
      });
      
      console.log('[UpdateManager] Force cache clear completed');
      
    } catch (error) {
      console.error('[UpdateManager] Force cache clear failed:', error);
    }
  };

  const clearAppStoragePreserveAuth = async () => {
    try {
      console.log('[UpdateManager] Clearing app storage while preserving authentication...');
      
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Auto-detect authentication and essential keys to preserve
      const preserveKeys = allKeys.filter(key => 
        // Supabase authentication keys
        key.includes('sb-') ||
        key.includes('supabase') ||
        // General authentication keys
        key.includes('auth') ||
        key.includes('session') ||
        key.includes('user') ||
        key.includes('token') ||
        // User preferences
        key === 'theme' ||
        key === 'language' ||
        key === 'chatSoundEnabled' ||
        key === 'preferredLanguage' ||
        // Version tracking (keep for update management)
        key === 'app-version' ||
        key === 'last-update-check' ||
        key === 'cache-cleared-version'
      );
      
      // Save values to preserve
      const preserved: Record<string, string> = {};
      preserveKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value !== null) {
          preserved[key] = value;
        }
      });
      
      console.log('[UpdateManager] Preserving keys:', preserveKeys);
      
      // Clear all localStorage
      localStorage.clear();
      
      // Restore preserved values
      Object.entries(preserved).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      // Clear sessionStorage but preserve auth-related data
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (!key.includes('sb-') && !key.includes('supabase') && !key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      // Use cache manager to clear browser caches
      await cacheManager.clearAllCaches();
      
      console.log('[UpdateManager] App storage cleared while preserving authentication');
      
    } catch (error) {
      console.error('[UpdateManager] Error clearing app storage:', error);
      throw error;
    }
  };

  const handleAutoUpdate = async (updateData: any) => {
    try {
      console.log('[UpdateManager] Starting auto-update:', updateData);
      
      // Clear storage while preserving auth data
      clearAppStorage(['theme', 'language', 'chatSoundEnabled', 'preferredLanguage']);
      
      // Mark version as updated
      if (updateData.version) {
        localStorage.setItem('app-version', updateData.version);
        localStorage.setItem('last-update-check', Date.now().toString());
      }
      
      // Skip waiting for new service worker
      if (serviceWorkerRegistration?.waiting) {
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Show brief update notification
      toast.success('App updated successfully! 🎉', {
        duration: 2000,
      });
      
      console.log('[UpdateManager] Auto-update completed, refreshing in 3 seconds...');
      
      // Auto-refresh after short delay for smooth experience
      setTimeout(() => {
        console.log('[UpdateManager] Auto-refreshing page...');
        window.location.reload();
      }, 3000); // 3 second delay to let user see the success message
      
    } catch (error) {
      console.error('[UpdateManager] Auto-update failed:', error);
    }
  };

  const clearAppStorage = (preserveKeys: string[] = []) => {
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Auto-detect and preserve authentication keys (like CacheManager does)
      const authKeys = allKeys.filter(key => 
        key.includes('sb-') ||           // Supabase auth tokens
        key.includes('supabase') ||      // Any Supabase data
        key.includes('auth') ||          // Auth-related keys
        key.includes('session') ||       // Session data
        key.includes('user') ||          // User data
        key.includes('token')            // Token data
      );
      
      // Combine explicit preserve keys with auto-detected auth keys
      const allPreserveKeys = [...preserveKeys, ...authKeys];
      
      console.log('[UpdateManager] Preserving keys:', allPreserveKeys);
      
      // Clear all except preserved keys
      allKeys.forEach(key => {
        if (!allPreserveKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Don't clear sessionStorage completely - it might contain auth data
      // Instead, clear only non-auth session data
      const sessionKeys = Object.keys(sessionStorage);
      sessionKeys.forEach(key => {
        if (!key.includes('sb-') && !key.includes('supabase') && !key.includes('auth')) {
          sessionStorage.removeItem(key);
        }
      });
      
      console.log('[UpdateManager] Storage cleared while preserving authentication data');
      
    } catch (error) {
      console.error('[UpdateManager] Error clearing storage:', error);
    }
  };

  const checkForUpdates = async () => {
    try {
      // Check service worker version
      if (serviceWorkerRegistration) {
        await serviceWorkerRegistration.update();
      }
      
      // Check app version from server (you can implement server-side version checking)
      await checkServerVersion();
      
    } catch (error) {
      console.error('[UpdateManager] Error checking for updates:', error);
    }
  };

  const fetchVersionInfo = async () => {
    try {
      // Fetch version info from server with cache busting
      const response = await fetch(`/version.json?t=${Date.now()}`);
      if (response.ok) {
        const versionData = await response.json();
        return versionData;
      }
    } catch (error) {
      console.error('[UpdateManager] Error fetching version info:', error);
    }
    return null;
  };

  const shouldShowUpdatePopup = (version: string): boolean => {
    // Don't show if update is in progress
    if (localStorage.getItem('update-in-progress') === 'true') {
      console.log('[UpdateManager] Skipping popup - update in progress');
      return false;
    }

    // Don't show if in cooldown period
    if (updateCooldown) {
      console.log('[UpdateManager] Skipping popup - in cooldown period');
      return false;
    }

    // Don't show if already showing
    if (showUpdatePrompt) {
      console.log('[UpdateManager] Skipping popup - already showing');
      return false;
    }

    // Don't show if this update was already completed
    const completedVersion = localStorage.getItem('update-completed');
    if (completedVersion === version) {
      console.log('[UpdateManager] Skipping popup - update already completed for version:', version);
      return false;
    }

    // Don't show if this is the current version we already have
    const currentVersion = localStorage.getItem('app-version');
    if (currentVersion === version) {
      console.log('[UpdateManager] Skipping popup - same as current version:', version);
      return false;
    }

    // Don't show if we already showed this version
    const dismissedVersion = localStorage.getItem('dismissed-update-version');
    const dismissedTime = localStorage.getItem('dismissed-update-time');
    
    if (dismissedVersion === version && dismissedTime) {
      const timeSinceDismissal = Date.now() - parseInt(dismissedTime);
      const oneHour = 60 * 60 * 1000;
      
      // Don't show same version again for 1 hour
      if (timeSinceDismissal < oneHour) {
        console.log('[UpdateManager] Skipping popup - same version dismissed recently');
        return false;
      }
    }

    // Don't show if we just showed any update popup recently
    const lastPopupTime = localStorage.getItem('last-popup-time');
    if (lastPopupTime) {
      const timeSinceLastPopup = Date.now() - parseInt(lastPopupTime);
      const fiveMinutes = 5 * 60 * 1000;
      
      if (timeSinceLastPopup < fiveMinutes) {
        console.log('[UpdateManager] Skipping popup - too soon since last popup');
        return false;
      }
    }

    return true;
  };

  const checkServerVersion = async () => {
    try {
      // Simplified version check - only for tracking, no prompts
      const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
      const appVersion = localStorage.getItem('app-version');
      const lastUpdateCheck = localStorage.getItem('last-update-check');
      
      // Fetch latest version info for tracking
      const versionInfo = await fetchVersionInfo();
      
      console.log('[UpdateManager] Background version check:', {
        buildTime,
        appVersion,
        lastUpdateCheck,
        serverVersion: versionInfo?.version
      });

      // Only update tracking data, no prompts
      if (buildTime && buildTime !== 'BUILD_TIME_PLACEHOLDER') {
        localStorage.setItem('app-build-time', buildTime);
      }

      localStorage.setItem('last-update-check', Date.now().toString());
      
      // Let service worker handle all update prompts/logic
      console.log('[UpdateManager] Server version check completed (passive mode)');
      
    } catch (error) {
      console.error('[UpdateManager] Error checking server version:', error);
    }
  };

  const handleUpdate = async () => {
    setIsUpdating(true);
    
    try {
      // Show progress message
      toast.info('Updating app and clearing cache...', {
        duration: 2000,
      });
      
      // Mark this version as seen BEFORE doing anything else  
      if (updateInfo?.version) {
        const currentTime = Date.now().toString();
        localStorage.setItem('app-version', updateInfo.version);
        localStorage.setItem('dismissed-update-version', updateInfo.version);
        localStorage.setItem('dismissed-update-time', currentTime);
        localStorage.setItem('last-update-check', currentTime);
        localStorage.setItem('update-completed', updateInfo.version);
        localStorage.setItem('update-completed-time', currentTime);
        cacheManager.markAsUpdated(updateInfo.version);
        console.log('[UpdateManager] Marked version as completed:', updateInfo.version);
      }
      
      // Hide the popup immediately to prevent spam
      setShowUpdatePrompt(false);
      setUpdateInfo(null);
      
      // Set cooldown to prevent immediate re-showing
      setUpdateCooldown(true);
      setTimeout(() => {
        setUpdateCooldown(false);
      }, 10000); // 10 second cooldown
      
      // Preserve authentication and user preferences during update
      const authData: Record<string, string | null> = {};
      
      // Preserve specific auth keys
      const keysToPreserve = [
        'supabase.auth.token',
        'user-session', 
        'auth-user',
        'theme',
        'language', 
        'chatSoundEnabled'
      ];
      
      keysToPreserve.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) authData[key] = value;
      });
      
      // Find all Supabase auth keys
      const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('sb-') && key.includes('auth') || 
        key.includes('supabase') ||
        key.includes('user') ||
        key.includes('session')
      );
      
      authKeys.forEach(key => {
        authData[key] = localStorage.getItem(key);
      });

      // Use the cache manager for comprehensive cache clearing
      const cacheCleared = await cacheManager.clearAllCaches();
      
      // Restore authentication data
      Object.keys(authData).forEach(key => {
        if (authData[key]) {
          localStorage.setItem(key, authData[key]);
        }
      });
      
      if (!cacheCleared) {
        throw new Error('Failed to clear cache');
      }
      
      // Skip waiting for new service worker
      if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Show success message
      toast.success('Update successful! App updated in background.', {
        duration: 3000,
      });
      
      // Mark update as complete
      localStorage.setItem('update-in-progress', 'false');
      localStorage.removeItem('update-in-progress');
      
      console.log('[UpdateManager] Update completed successfully for version:', updateInfo.version);
      
      // Auto-refresh for immediate effect (this function should rarely be used now)
      setTimeout(() => {
        console.log('[UpdateManager] Auto-refreshing page after manual update...');
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('[UpdateManager] Error during update:', error);
      toast.error('Update failed. Please refresh manually.');
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
    
    // Track dismissed version to prevent showing again
    if (updateInfo?.version) {
      localStorage.setItem('dismissed-update-version', updateInfo.version);
      localStorage.setItem('dismissed-update-time', Date.now().toString());
    }
    
    setUpdateInfo(null);
  };

  if (!showUpdatePrompt || !updateInfo?.available) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {isPWA ? (
                <Smartphone className="h-6 w-6 text-primary" />
              ) : (
                <Globe className="h-6 w-6 text-primary" />
              )}
              <CardTitle className="text-lg">App Update Available</CardTitle>
            </div>
            <Badge variant="secondary" className="bg-primary/10 text-primary">
              v{updateInfo.version}
            </Badge>
          </div>
          <CardDescription className="text-sm text-muted-foreground">
            {updateInfo.message}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-0">
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <RefreshCw className="h-4 w-4" />
                What's included:
              </div>
              <ul className="text-sm space-y-1 text-muted-foreground">
                {updateInfo.releaseNotes && updateInfo.releaseNotes.length > 0 ? (
                  updateInfo.releaseNotes.map((note, index) => (
                    <li key={index}>• {note}</li>
                  ))
                ) : (
                  <li>• Loading release notes...</li>
                )}
                {isPWA && <li>• Updated offline capabilities</li>}
              </ul>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleUpdate} 
                disabled={isUpdating}
                className="flex-1"
                size="sm"
              >
                {isUpdating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Update Now
                  </>
                )}
              </Button>
              
              {!updateInfo.forced && (
                <Button 
                  variant="outline" 
                  onClick={dismissUpdate}
                  size="sm"
                  className="px-3"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {isPWA && (
              <div className="text-xs text-center text-muted-foreground bg-primary/5 rounded p-2">
                💡 Your installed app will be updated automatically
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppUpdateManager; 