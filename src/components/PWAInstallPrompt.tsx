import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');

  useEffect(() => {
    // Check if app is already installed
    const isInstalled = window.matchMedia('(display-mode: standalone)').matches;
    setIsInstalled(isInstalled);

    // Check if iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(iOS);

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('beforeinstallprompt event fired!', e);
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
      setDebugInfo('Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Show prompt for testing even without beforeinstallprompt
    const fallbackTimer = setTimeout(() => {
      if (!deferredPrompt && !iOS && !isInstalled) {
        setShowPrompt(true);
        setDebugInfo('Showing test prompt (no native support)');
      }
    }, 2000);

    // For iOS, show prompt after a delay if not installed
    if (iOS && !isInstalled) {
      const iosTimer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000); // Show after 3 seconds for testing

      return () => {
        clearTimeout(iosTimer);
        clearTimeout(fallbackTimer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      };
    }

    // For testing - show prompt on all devices after 5 seconds
    const testTimer = setTimeout(() => {
      if (!isInstalled) {
        setShowPrompt(true);
      }
    }, 5000);

    return () => {
      clearTimeout(fallbackTimer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('Install button clicked. deferredPrompt:', deferredPrompt);
    
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('User choice:', outcome);
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('Install prompt failed:', error);
        setDebugInfo('Install failed: ' + error);
      }
    } else {
      // Fallback: show manual instructions
      setDebugInfo('No native install support. Manual install required.');
      alert(`To install this app:
      
1. Open browser menu (⋮)
2. Look for "Install app" or "Add to Home Screen"
3. Follow the instructions

Or bookmark this page for quick access!`);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Don't show again for 24 hours
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed or dismissed recently
  if (isInstalled) return null;
  
  // Comment out for testing - show even if dismissed
  // const dismissedTime = localStorage.getItem('pwa-install-dismissed');
  // if (dismissedTime && Date.now() - parseInt(dismissedTime) < 24 * 60 * 60 * 1000) {
  //   return null;
  // }

  if (!showPrompt) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 shadow-lg border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 md:left-auto md:right-4 md:max-w-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Install NoorCare App</h3>
              <p className="text-xs text-muted-foreground mb-2">
                {isIOS 
                  ? "Add to Home Screen for a better experience!" 
                  : "Install our app for faster access and offline support!"
                }
              </p>
              {debugInfo && (
                <p className="text-xs text-blue-600 mb-2 font-mono">
                  Debug: {debugInfo}
                </p>
              )}
              
              {isIOS ? (
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>1. Tap the Share button <span className="font-mono">↗</span></p>
                  <p>2. Select "Add to Home Screen"</p>
                  <p>3. Tap "Add"</p>
                </div>
              ) : (
                <Button 
                  onClick={handleInstallClick}
                  size="sm" 
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {deferredPrompt ? 'Install App' : 'Manual Install'}
                </Button>
              )}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0 flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PWAInstallPrompt; 