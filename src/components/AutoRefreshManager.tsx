import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

interface AutoRefreshManagerProps {
  checkInterval?: number; // in milliseconds, default 2 minutes
}

const AutoRefreshManager: React.FC<AutoRefreshManagerProps> = ({ 
  checkInterval = 2 * 60 * 1000 // 2 minutes
}) => {
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState<string>('');
  const [lastKnownTrigger, setLastKnownTrigger] = useState<string>('');

  useEffect(() => {
    // Get initial trigger value
    const stored = localStorage.getItem('last-update-trigger');
    if (stored) {
      setLastKnownTrigger(stored);
    }

    // Start checking for updates
    checkForUpdates();
    const interval = setInterval(checkForUpdates, checkInterval);

    return () => clearInterval(interval);
  }, [checkInterval]);

  const checkForUpdates = async () => {
    try {
      // Check update trigger file
      const response = await fetch(`/update-trigger.txt?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (response.ok) {
        const currentTrigger = await response.text();
        const trimmedTrigger = currentTrigger.trim();
        
        if (trimmedTrigger && trimmedTrigger !== lastKnownTrigger) {
          console.log('[AutoRefresh] Update detected:', {
            current: trimmedTrigger,
            last: lastKnownTrigger
          });
          
          setUpdateTrigger(trimmedTrigger);
          setShowUpdatePrompt(true);
          
          // Show toast notification
          toast.info('🚀 System Update Available!', {
            description: 'A new version is available. Please refresh to get the latest features.',
            duration: 10000,
            action: {
              label: 'Refresh Now',
              onClick: handleRefresh
            }
          });
        }
      }
    } catch (error) {
      console.warn('[AutoRefresh] Could not check for updates:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    
    try {
      // Store the current trigger to prevent showing the prompt again
      localStorage.setItem('last-update-trigger', updateTrigger);
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }
      
      // Clear localStorage except for important data
      const preserveKeys = [
        'theme', 
        'language', 
        'preferredLanguage',
        'chatSoundEnabled',
        'notificationPreferences',
        'last-update-trigger'
      ];
      
      const keysToPreserve: { [key: string]: string } = {};
      preserveKeys.forEach(key => {
        const value = localStorage.getItem(key);
        if (value) keysToPreserve[key] = value;
      });
      
      localStorage.clear();
      
      // Restore preserved keys
      Object.entries(keysToPreserve).forEach(([key, value]) => {
        localStorage.setItem(key, value);
      });
      
      // Force reload with cache bypass
      window.location.reload();
      
    } catch (error) {
      console.error('[AutoRefresh] Error during refresh:', error);
      setIsRefreshing(false);
      
      // Fallback: simple reload
      window.location.reload();
    }
  };

  const handleDismiss = () => {
    // Store the trigger to prevent showing again
    localStorage.setItem('last-update-trigger', updateTrigger);
    setShowUpdatePrompt(false);
  };

  if (!showUpdatePrompt) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-2xl border-2 border-blue-200 bg-blue-50">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-blue-800">System Update Available!</CardTitle>
              <CardDescription className="text-blue-700">
                New features and improvements are ready
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              The system has been updated with new features and bug fixes. 
              Please refresh to get the latest version.
            </AlertDescription>
          </Alert>

          <div className="bg-white rounded-lg p-4 border border-blue-200">
            <h4 className="font-semibold text-blue-800 mb-2">What's New:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Enhanced performance and reliability</li>
              <li>• Updated user interface components</li>
              <li>• Bug fixes and security improvements</li>
              <li>• New features and functionality</li>
            </ul>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isRefreshing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh Now
                </>
              )}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              disabled={isRefreshing}
              className="px-4 border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              Later
            </Button>
          </div>

          <div className="text-xs text-center text-blue-600 bg-blue-100 rounded p-2">
            💡 Your data and preferences will be preserved during the refresh
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoRefreshManager; 