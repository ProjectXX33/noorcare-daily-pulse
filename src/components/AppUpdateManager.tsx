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

  useEffect(() => {
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
    
    // Check for updates periodically (every 5 minutes)
    const updateCheckInterval = setInterval(checkForUpdates, 5 * 60 * 1000);

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
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker installed, show update prompt
                setUpdateInfo({
                  available: true,
                  version: 'Latest',
                  message: 'A new version is available with bug fixes and improvements!'
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
      case 'APP_UPDATED':
        console.log('[UpdateManager] App update detected:', data);
        setUpdateInfo({
          available: true,
          version: data.version,
          message: data.message || 'App has been updated!'
        });
        setShowUpdatePrompt(true);
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

  const clearAppStorage = (preserveKeys: string[] = []) => {
    try {
      // Get all localStorage keys
      const allKeys = Object.keys(localStorage);
      
      // Clear all except preserved keys
      allKeys.forEach(key => {
        if (!preserveKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      // Clear sessionStorage completely
      sessionStorage.clear();
      
      // Clear any cached data from context/state
      if (window.location.pathname !== '/login') {
        console.log('[UpdateManager] Storage cleared, refreshing app state');
      }
      
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

  const checkServerVersion = async () => {
    try {
      // Check multiple sources for version detection
      const buildTime = document.querySelector('meta[name="build-time"]')?.getAttribute('content');
      const currentBuildTime = localStorage.getItem('app-build-time');
      const appVersion = localStorage.getItem('app-version');
      const lastUpdateCheck = localStorage.getItem('last-update-check');
      
      console.log('[UpdateManager] Version check:', {
        buildTime,
        currentBuildTime,
        appVersion,
        lastUpdateCheck
      });

      // If build time changed or no previous version stored
      if (buildTime && buildTime !== 'BUILD_TIME_PLACEHOLDER' && buildTime !== currentBuildTime) {
        console.log('[UpdateManager] Build time changed, triggering update');
        setUpdateInfo({
          available: true,
          version: 'Latest',
          message: 'A new version is available! Please refresh to get the latest updates.'
        });
        setShowUpdatePrompt(true);
        return;
      }

      // Force update check if no previous version or very old
      if (!appVersion || !lastUpdateCheck) {
        console.log('[UpdateManager] No version history, checking for updates');
        setUpdateInfo({
          available: true,
          version: 'Latest',
          message: 'Welcome! Please refresh to ensure you have the latest version.'
        });
        setShowUpdatePrompt(true);
        return;
      }

      // Check if it's been more than 30 minutes since last update check
      const timeSinceLastCheck = Date.now() - parseInt(lastUpdateCheck || '0');
      const thirtyMinutes = 30 * 60 * 1000;
      
      if (timeSinceLastCheck > thirtyMinutes) {
        console.log('[UpdateManager] Periodic update check triggered');
        setUpdateInfo({
          available: true,
          version: 'Latest',
          message: 'Checking for updates... Please refresh to ensure you have the latest version.'
        });
        setShowUpdatePrompt(true);
        return;
      }
      
      // Store current build time if we have it
      if (buildTime && buildTime !== 'BUILD_TIME_PLACEHOLDER') {
        localStorage.setItem('app-build-time', buildTime);
      }

      // Update last check time
      localStorage.setItem('last-update-check', Date.now().toString());
      
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
      
      // Use the cache manager for comprehensive cache clearing
      const cacheCleared = await cacheManager.clearAllCaches();
      
      if (!cacheCleared) {
        throw new Error('Failed to clear cache');
      }
      
      // Skip waiting for new service worker
      if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
        serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      
      // Mark app as updated
      if (updateInfo?.version) {
        cacheManager.markAsUpdated(updateInfo.version);
      }
      
      // Show success message
      toast.success('Update successful! Refreshing app...', {
        duration: 2000,
      });
      
      // Use cache manager's force refresh method
      setTimeout(() => {
        cacheManager.forceRefresh();
      }, 1000);
      
    } catch (error) {
      console.error('[UpdateManager] Error during update:', error);
      toast.error('Update failed. Please refresh manually.');
      setIsUpdating(false);
    }
  };

  const dismissUpdate = () => {
    setShowUpdatePrompt(false);
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
                <li>• Bug fixes and performance improvements</li>
                <li>• Enhanced security features</li>
                <li>• Fresh app cache for better performance</li>
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